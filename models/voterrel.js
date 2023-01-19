"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class VoterRel extends Model {
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
      });
      return addVoter;
    }

    static async retriveVoters(electionId) {
      let retriveVoters = await this.findAll({
        where: {
          electionId,
        },
        order: [["id", "ASC"]],
      });
      return retriveVoters;
    }

    static async retriveVoter(electionId) {
      let retriveVoter = await this.findOne({
        where: {
          electionId,
        },
        order: [["id", "ASC"]],
      });
      return retriveVoter;
    }

    static async removeVoter(id) {
      let removeVoter = await this.destroy({
        where: {
          id,
        },
      });
      return removeVoter;
    }

    static editPassword(Voterid, newpassword) {
      let editPassword = this.update(
        {
          password: newpassword,
        },
        {
          where: {
            voterid: Voterid,
          },
        }
      );
      return editPassword;
    }

    static associate(models) {
      // define association here
      VoterRel.belongsTo(models.Election, {
        foreignKey: "electionId",
      });
      VoterRel.hasMany(models.answer, {
        foreignKey: "voterId",
        onDelete: "CASCADE",
      });
    }
  }
  VoterRel.init(
    {
      voterid: DataTypes.STRING,
      password: DataTypes.STRING,
      case: DataTypes.STRING,
      voted: DataTypes.BOOLEAN,
    },
    {
      sequelize,
      modelName: "VoterRel",
    }
  );
  return VoterRel;
};
