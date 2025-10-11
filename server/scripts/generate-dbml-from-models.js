/*
 Generate DBML ERD by introspecting Mongoose models (complete attributes + refs)
 Output: server/erd-from-models.dbml
*/
const fs = require('fs');
const path = require('path');
const mongoose = require('mongoose');

const MODELS_DIR = path.join(__dirname, '..', 'models');
const OUTPUT = path.join(__dirname, '..', 'erd-from-models.dbml');

// Whitelist of tables to include (use collection/model names in lowercase)
const WHITELIST = new Set([
  'user',
  'doctor',
  'appointment',
  'payment',
  'chatroom',
  'message',
  'shift',
  'overtime',
  'leave',
  'shiftswap',   
  'medicalrecord',
  'prescription',
  'healthmetrics',
  'timeslot',    
  'medicine'   
]);

function listModelFiles(dir) {
  return fs.readdirSync(dir)
    .filter(f => f.endsWith('Model.js'))
    .map(f => path.join(dir, f));
}

function loadModels(files) {
  files.forEach(f => {
    try { require(f); } catch (e) { console.warn('Skip', path.basename(f), e.message); }
  });
}

function mapDbmlType(pathObj) {
  const t = pathObj.instance;
  switch (t) {
    case 'String': return 'varchar';
    case 'Number': return 'int';
    case 'Decimal128': return 'float';
    case 'Boolean': return 'boolean';
    case 'Date': return 'datetime';
    case 'ObjectId': return 'varchar';
    case 'Array': return 'json';
    case 'Buffer': return 'binary';
    default: return 'varchar';
  }
}

function flattenSubschema(prefix, schema, collector) {
  Object.entries(schema.paths).forEach(([name, p]) => {
    if (name === '__v') return;
    const key = `${prefix}_${name}`;
    collector.push({ name: key, type: p.instance, pathObj: p });
  });
}

function extractModelInfo(modelName) {
  const model = mongoose.model(modelName);
  const schema = model.schema;
  const attrs = [];
  const singleRefs = [];
  const arrayRefs = [];
  const embeddedTables = [];

  Object.entries(schema.paths).forEach(([name, p]) => {
    if (name === '__v') return;
    const safeName = name.replace(/\./g, '_');
    // Subdocument (Schema.Types.Mixed or nested schema via dot) are represented as regular paths; retain as json
    if (p.instance === 'Array') {
      // array of refs
      const caster = p.caster;
      if (caster && /ObjectId/i.test(caster.instance || '')) {
        const ref = caster.options && caster.options.ref;
        if (ref) {
          // emit both the column and the relationship so DBML has a valid field
          attrs.push({ name: safeName, type: 'varchar' });
          arrayRefs.push({ target: ref, via: safeName });
        } else {
          attrs.push({ name: safeName, type: 'json' });
        }
      } else {
        // Handle array of embedded subdocuments (e.g., Prescription.medications)
        // If this is Prescription.medications, synthesize a 'medicine' table
        if (modelName === 'Prescription' && safeName === 'medications' && (p.schema || (caster && caster.schema))) {
          const subSchema = p.schema || (caster && caster.schema);
          const cols = [];
          // Subdocument id (exists by default in Mongoose subdocs)
          cols.push({ name: '_id', type: 'varchar', pk: true });
          // Parent link
          cols.push({ name: 'prescriptionId', type: 'varchar' });
          // Extract fields from embedded schema
          Object.entries(subSchema.paths).forEach(([subName, subPath]) => {
            if (subName === '__v' || subName === '_id') return;
            const subSafe = subName.replace(/\./g, '_');
            cols.push({ name: subSafe, type: mapDbmlType(subPath) });
          });
          embeddedTables.push({
            name: 'medicine',
            columns: cols,
            rel: { via: 'prescriptionId', target: 'Prescription' }
          });
          // Keep a summary column on parent for completeness
          attrs.push({ name: safeName, type: 'json' });
        } else {
          attrs.push({ name: safeName, type: 'json' });
        }
      }
    } else if (/ObjectId/i.test(p.instance || '')) {
      const ref = p.options && p.options.ref;
      if (ref) singleRefs.push({ target: ref, via: safeName });
      attrs.push({ name: safeName, type: 'varchar' });
    } else {
      attrs.push({ name: safeName, type: mapDbmlType(p) });
    }
  });

  // Add timestamps if configured
  if (schema?.options?.timestamps) {
    if (!attrs.find(a => a.name === 'createdAt')) attrs.push({ name: 'createdAt', type: 'datetime' });
    if (!attrs.find(a => a.name === 'updatedAt')) attrs.push({ name: 'updatedAt', type: 'datetime' });
  }

  // Primary key
  if (!attrs.find(a => a.name === '_id')) attrs.unshift({ name: '_id', type: 'varchar', pk: true });
  else attrs.find(a => a.name === '_id').pk = true;

  return { modelName, attrs, singleRefs, arrayRefs, embeddedTables };
}

function toDbCollectionName(modelName) {
  // Mongoose default pluralization is not always predictable; fall back to lowercase modelName.
  return modelName.toLowerCase();
}

function buildDbml(nodes) {
  // filter nodes by whitelist
  const filteredNodes = nodes.filter(n => WHITELIST.has(toDbCollectionName(n.modelName)));
  // collect embedded tables from the filtered nodes and keep only whitelisted
  const embedded = filteredNodes.flatMap(n => n.embeddedTables || []).filter(t => WHITELIST.has(t.name));
  const lines = [];
  lines.push('// Auto-generated DBML from Mongoose models');
  lines.push('// Paste into https://dbdiagram.io');
  lines.push('');

  // Tables
  filteredNodes.forEach(n => {
    const table = toDbCollectionName(n.modelName);
    lines.push(`Table ${table} {`);
    n.attrs.forEach(a => {
      const pk = a.pk ? ' [pk]' : '';
      lines.push(`  ${a.name} ${a.type}${pk}`);
    });
    lines.push('}');
    lines.push('');
  });

  // Embedded/virtual tables (e.g., medicine from Prescription.medications)
  embedded.forEach(t => {
    lines.push(`Table ${t.name} {`);
    t.columns.forEach(c => {
      const pk = c.pk ? ' [pk]' : '';
      lines.push(`  ${c.name} ${c.type}${pk}`);
    });
    lines.push('}');
    lines.push('');
  });

  // Relationships
  filteredNodes.forEach(n => {
    const source = toDbCollectionName(n.modelName);
    n.singleRefs.forEach(r => {
      const target = toDbCollectionName(r.target);
      if (source !== target && WHITELIST.has(target)) lines.push(`Ref: ${source}.${r.via} > ${target}._id`);
    });
    n.arrayRefs.forEach(r => {
      const target = toDbCollectionName(r.target);
      if (source !== target && WHITELIST.has(target)) lines.push(`Ref: ${source}.${r.via} > ${target}._id`);
    });
  });

  // Relationships for embedded tables
  embedded.forEach(t => {
    const target = toDbCollectionName(t.rel.target);
    if (WHITELIST.has(t.name) && WHITELIST.has(target)) {
      lines.push(`Ref: ${t.name}.${t.rel.via} > ${target}._id`);
    }
  });

  return lines.join('\n');
}

function main() {
  const files = listModelFiles(MODELS_DIR);
  loadModels(files);
  const modelNames = mongoose.modelNames();
  const nodes = modelNames.map(extractModelInfo);
  const dbml = buildDbml(nodes);
  fs.writeFileSync(OUTPUT, dbml, 'utf8');
  console.log(`DBML from models written to ${OUTPUT}`);
}

if (require.main === module) {
  main();
}
