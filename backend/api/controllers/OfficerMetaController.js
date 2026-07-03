module.exports = {
  validators: async function (req, res) {
    return res.ok({
      items: ValidationRegistry.listValidators(),
    }, 'Validator metadata loaded successfully.');
  },

  fieldQueries: async function (req, res) {
    return res.ok({
      items: FieldResolver.listQueries(),
    }, 'Field query metadata loaded successfully.');
  },
};
