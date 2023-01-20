"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class answer extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static async addAnswer({ voterId, electionId, questionId, choosenOption }) {
      let addAnswer = await this.create({
        voterId,
        electionId,
        questionId,
        choosenOption,
      });
      return addAnswer;
    }

    static async retriveAnswers(electionId) {
      let retriveAnswers = await this.findAll({
        where: {
          electionId,
        },
      });
      return retriveAnswers;
    }

    static async retriveOptionCount({ electionId, choosenOption, questionId }) {
      let retriveOptionCount = await this.count({
        where: {
          electionId,
          choosenOption,
          questionId,
        },
      });
      return retriveOptionCount;
    }

    static associate(models) {
      // define association here
      answer.belongsTo(models.Election, {
        foreignKey: "electionId",
        onDelete: "CASCADE",
      });
      answer.belongsTo(models.questions, {
        foreignKey: "questionId",
        onDelete: "CASCADE",
      });
      answer.belongsTo(models.Options, {
        foreignKey: "choosenOption",
        onDelete: "CASCADE",
      });
      answer.belongsTo(models.VoterRel, {
        foreignKey: "voterId",
        onDelete: "CASCADE",
      });
    }
  }
  answer.init(
    {},
    {
      sequelize,
      modelName: "answer",
    }
  );
  return answer;
};
