"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class admin extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    resetPassword(password) {
      return this.update({ password });
    }

    static associate(models) {
      // define association here
      admin.hasMany(models.Election, {
        foreignKey: "adminID",
      });
    }
  }
  admin.init(
    {
      firstName: DataTypes.STRING,
      lastName: DataTypes.STRING,
      email: DataTypes.STRING,
      password: DataTypes.STRING,
      case: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "admin",
    }
  );
  return admin;
};
