"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static associate(models) {
      // define association here
      election.belongsTo(models.admin, {
        foreignKey: "adminID",
      });
    }
  }
  election.init(
    {
      electionName: DataTypes.STRING,
      launched: DataTypes.BOOLEAN,
      ended: DataTypes.BOOLEAN,
      publicurl: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "election",
    }
  );
  return election;
};
