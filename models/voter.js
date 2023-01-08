"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Voters extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static async addVoter({ voterid, password, electionId }) {
      let addVoter = await this.create({
        voterid,
        password,
        electionId,
        voted: false,
      });
      return addVoter;
    }
    static associate(models) {
      // define association here
      Voters.belongsTo(models.Election, {
        foreignKey: "electionId",
      });
    }
  }
  Voters.init(
    {
      voterid: DataTypes.STRING,
      password: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Voters",
    }
  );
  return Voters;
};
