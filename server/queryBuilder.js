import relations from './relations.js';

// Parse "*, rel1(col1,col2), rel2(name, rel3(name))" into AST
export function parseSelect(selectStr) {
  if (!selectStr || selectStr.trim() === '*') return { columns: ['*'], relations: [] };

  const rels = [];
  const cols = [];

  // Extract relation(...) groups first using a simple state machine
  let i = 0;
  const str = selectStr.trim();
  let token = '';

  while (i <= str.length) {
    const ch = str[i] || ',';

    if (ch === '(') {
      // Start of a relation – token is the relation name
      const relName = token.trim();
      token = '';
      i++;
      let depth = 1;
      let inner = '';
      while (i < str.length && depth > 0) {
        if (str[i] === '(') depth++;
        if (str[i] === ')') depth--;
        if (depth > 0) inner += str[i];
        i++;
      }
      rels.push({ name: relName, inner: inner.trim() });
      // skip trailing comma
      if (str[i] === ',') i++;
    } else if (ch === ',') {
      const col = token.trim();
      if (col) cols.push(col);
      token = '';
      i++;
    } else {
      token += ch;
      i++;
    }
  }

  // Parse nested relations recursively
  const parsedRels = rels.map(r => ({
    name: r.name,
    ...parseSelect(r.inner),
  }));

  return { columns: cols.length ? cols : ['*'], relations: parsedRels };
}

// Build the SELECT clause and JOINs for a query
// Returns: { selectClause, subqueries }
// Uses subqueries to avoid JOIN row-multiplication
export function buildSelectSQL(table, selectAST, alias = 't') {
  const subqueries = [];

  for (const rel of selectAST.relations) {
    const relDef = relations[table]?.[rel.name];
    if (!relDef) continue;

    const relAlias = `_${rel.name}`;

    // Build the columns for the subquery
    const relCols = rel.columns[0] === '*'
      ? `row_to_json(${relAlias}.*)`
      : buildRelColumnSQL(rel, relAlias, relDef.table);

    subqueries.push(
      `(SELECT ${relCols} FROM ${relDef.table} ${relAlias} WHERE ${relAlias}.${relDef.foreignKey} = ${alias}.${relDef.localKey} LIMIT 1) AS ${rel.name}`
    );
  }

  const mainCols = selectAST.columns[0] === '*' ? `${alias}.*` : selectAST.columns.map(c => `${alias}.${c}`).join(', ');
  const selectClause = [mainCols, ...subqueries].join(',\n  ');

  return selectClause;
}

function buildRelColumnSQL(rel, relAlias, relTable, depth = 0) {
  const parts = [];

  for (const col of rel.columns) {
    parts.push(`'${col}', ${relAlias}.${col}`);
  }

  // Nested relations (recursive to support arbitrary depth)
  for (const nested of rel.relations) {
    const nestedRelDef = relations[relTable]?.[nested.name];
    if (!nestedRelDef) continue;

    const nestedAlias = `_n${depth}_${nested.name}`;
    // Recurse to support deeper nesting (e.g. spare_parts → phone_models → spare_parts_brands → phone_categories)
    const nestedJson = buildRelColumnSQL(nested, nestedAlias, nestedRelDef.table, depth + 1);

    parts.push(
      `'${nested.name}', (SELECT ${nestedJson} FROM ${nestedRelDef.table} ${nestedAlias} WHERE ${nestedAlias}.${nestedRelDef.foreignKey} = ${relAlias}.${nestedRelDef.localKey} LIMIT 1)`
    );
  }

  return `json_build_object(${parts.join(', ')})`;
}

// Build WHERE clause from filters array
// filters: [['col', 'op', value], ...]
export function buildWhereSQL(filters, params, alias = 't') {
  if (!filters || filters.length === 0) return '';

  const clauses = filters.map(([col, op, val]) => {
    params.push(val);
    const ref = `${alias}.${col}`;
    const placeholder = `$${params.length}`;

    switch (op) {
      case 'eq':   return val === null ? `${ref} IS NULL` : `${ref} = ${placeholder}`;
      case 'neq':  return val === null ? `${ref} IS NOT NULL` : `${ref} != ${placeholder}`;
      case 'gt':   return `${ref} > ${placeholder}`;
      case 'gte':  return `${ref} >= ${placeholder}`;
      case 'lt':   return `${ref} < ${placeholder}`;
      case 'lte':  return `${ref} <= ${placeholder}`;
      case 'like': return `${ref} LIKE ${placeholder}`;
      case 'ilike':return `${ref} ILIKE ${placeholder}`;
      case 'is':   return val === null ? `${ref} IS NULL` : `${ref} IS ${placeholder}`;
      case 'in':   {
        // val should be an array
        const arr = Array.isArray(val) ? val : [val];
        params.pop(); // remove last added
        const placeholders = arr.map(v => { params.push(v); return `$${params.length}`; });
        return `${ref} = ANY(ARRAY[${placeholders.join(',')}])`;
      }
      default:     return `${ref} = ${placeholder}`;
    }
  });

  return 'WHERE ' + clauses.join(' AND ');
}

// Build ORDER BY clause
// orders: [['col', 'asc'|'desc'], ...]
export function buildOrderSQL(orders, alias = 't') {
  if (!orders || orders.length === 0) return '';
  return 'ORDER BY ' + orders.map(([col, dir]) => `${alias}.${col} ${dir === 'desc' ? 'DESC' : 'ASC'}`).join(', ');
}
