function formatError(field, fallback) {
  return `${field.errorCode || 'FIELD_ERR.INVALID'}: ${field.errorMessage || fallback}`;
}

function hasValue(value) {
  return value !== undefined && value !== null && value !== '';
}

function isObjectId(value) {
  return /^[a-f\d]{24}$/i.test(String(value || ''));
}

module.exports = {
  validate: function (fields, TRANSBODY) {
    const activeFields = (fields || [])
      .filter(field => field.status !== 'inactive')
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    for (const field of activeFields) {
      const value = TRANSBODY[field.fieldName];

      if (field.isRequired && !hasValue(value)) {
        throw new Error(formatError(field, `Field "${field.fieldName}" is required.`));
      }

      if (!hasValue(value)) {
        continue;
      }

      if (field.fieldFormat === 'number') {
        const numericValue = Number(value);
        if (Number.isNaN(numericValue)) {
          throw new Error(formatError(field, `Field "${field.fieldName}" must be a number.`));
        }
        if (field.minLength !== null && field.minLength !== undefined && numericValue < Number(field.minLength)) {
          throw new Error(formatError(field, `Field "${field.fieldName}" is below minimum value.`));
        }
        if (field.maxLength !== null && field.maxLength !== undefined && numericValue > Number(field.maxLength)) {
          throw new Error(formatError(field, `Field "${field.fieldName}" is above maximum value.`));
        }
      }

      if (field.fieldFormat === 'string') {
        const stringValue = String(value);
        if (field.minLength !== null && field.minLength !== undefined && stringValue.length < Number(field.minLength)) {
          throw new Error(formatError(field, `Field "${field.fieldName}" is too short.`));
        }
        if (field.maxLength !== null && field.maxLength !== undefined && stringValue.length > Number(field.maxLength)) {
          throw new Error(formatError(field, `Field "${field.fieldName}" is too long.`));
        }
      }

      if (field.fieldFormat === 'objectId' && !isObjectId(value)) {
        throw new Error(formatError(field, `Field "${field.fieldName}" must be an ObjectId.`));
      }

      if (field.regex) {
        const regex = new RegExp(field.regex);
        if (!regex.test(String(value))) {
          throw new Error(formatError(field, `Field "${field.fieldName}" does not match required format.`));
        }
      }
    }
  },
};
