function getFieldValue(TRANSBODY, fieldName) {
  return TRANSBODY[fieldName];
}

function buildError(validation, fallback) {
  return `${validation.errorCode || 'VALIDATION_ERR.INVALID'}: ${validation.errorMessage || fallback}`;
}

const validators = {
  validateReceiverIsNotSender: async function (validation, TRANSBODY) {
    const fields = validation.validateFields.split(':');
    const sender = getFieldValue(TRANSBODY, fields[0]);
    const receiver = getFieldValue(TRANSBODY, fields[1]);

    if (sender && receiver && sender === receiver) {
      throw new Error(buildError(validation, 'Sender and receiver must be different.'));
    }
  },

  validateMinAmount: async function (validation, TRANSBODY) {
    const fields = validation.validateFields.split(':');
    const amount = Number(getFieldValue(TRANSBODY, fields[0])) || 0;
    const minimum = Number(fields[1]) || 0;

    if (amount < minimum) {
      throw new Error(buildError(validation, `Amount must be at least ${minimum}.`));
    }
  },

  validateSenderAccountSufficiency: async function (validation, TRANSBODY) {
    const fields = validation.validateFields.split(':');
    const senderPocketId = getFieldValue(TRANSBODY, fields[0]);
    const amount = Number(getFieldValue(TRANSBODY, fields[1])) || 0;
    const fee = Number(getFieldValue(TRANSBODY, fields[2])) || 0;
    const pocket = await Pocket.findOne({ id: senderPocketId, status: 'active' });

    if (!pocket || Number(pocket.balance) < amount + fee) {
      throw new Error(buildError(validation, 'Sender balance is insufficient.'));
    }
  },

  validatePocketActive: async function (validation, TRANSBODY) {
    const pocketId = getFieldValue(TRANSBODY, validation.validateFields);
    const pocket = await Pocket.findOne({ id: pocketId, status: 'active' });

    if (!pocket) {
      throw new Error(buildError(validation, 'Pocket is not active.'));
    }
  },

  validatePocketChecksum: async function (validation, TRANSBODY) {
    const pocketId = getFieldValue(TRANSBODY, validation.validateFields);
    const pocket = await Pocket.findOne({ id: pocketId });

    if (!pocket) {
      throw new Error(buildError(validation, 'Pocket was not found.'));
    }

    const checksum = SecurityUtil.generatePocketChecksum(pocket.balance, pocket.user);
    if (pocket.checksum && pocket.checksum !== checksum) {
      throw new Error(buildError(validation, 'Pocket checksum is invalid.'));
    }
  },
};

module.exports = {
  listValidators: function () {
    return Object.keys(validators);
  },

  validate: async function (validations, TRANSBODY) {
    const activeValidations = (validations || [])
      .filter(validation => validation.status !== 'inactive')
      .sort((a, b) => (a.order || 0) - (b.order || 0));

    for (const validation of activeValidations) {
      const validator = validators[validation.validateFunc];
      if (!validator) {
        throw new Error(`SYS_ERR.VALIDATOR_UNKNOWN: Validator "${validation.validateFunc}" is not registered.`);
      }
      await validator(validation, TRANSBODY);
    }
  },
};
