"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class question extends Model {
    static countquestions(electionid) {
      return this.count({
        where: {
          electionid,
        },
      });
    }

    static addquestion({ questionname, description, electionid }) {
      return this.create({
        questionname,
        description,
        electionid,
      });
    }

    static getquestion(id) {
      return this.findOne({
        where: {
          id,
        },
        order: [["id", "ASC"]],
      });
    }

    static deletequestion(id) {
      return this.destroy({
        where: {
          id,
        },
      });
    }

    static editquestion(questionname, desctiption, questionid) {
      return this.update(
        {
          questionname: questionname,
          description: desctiption,
        },
        {
          where: {
            id: questionid,
          },
        }
      );
    }

    static getallquestions(electionid) {
      return this.findAll({
        where: {
          electionid,
        },
        order: [["id", "ASC"]],
      });
    }

    static associate(models) {
      question.belongsTo(models.election, {
        foreignKey: "electionid",
      });
    }
  }
  question.init(
    {
      questionname: DataTypes.STRING,
      description: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "question",
    }
  );
  return question;
};
