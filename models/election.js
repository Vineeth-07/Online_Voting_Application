"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class election extends Model {
    static addelection({ electionName, adminid, publicurl }) {
      return this.create({
        electionName,
        publicurl,
        adminid,
      });
    }

    static getpublicurl(publicurl) {
      return this.findOne({
        where: {
          publicurl,
        },
      });
    }

    static getelectionurl(publicurl) {
      return this.findOne({
        where: {
          publicurl,
        },
        order: [["id", "ASC"]],
      });
    }

    static getelection(adminid) {
      return this.findOne({
        where: {
          adminid,
        },
        order: [["id", "ASC"]],
      });
    }

    static getelections(adminid) {
      return this.findAll({
        where: {
          adminid,
        },
        order: [["id", "ASC"]],
      });
    }

    static launch(id) {
      return this.update(
        {
          launched: true,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }

    static end(id) {
      return this.election.update(
        {
          ended: true,
        },
        {
          where: {
            id: id,
          },
        }
      );
    }

    static associate(models) {
      election.belongsTo(models.admin, {
        foreignKey: "adminid",
      });
      election.hasMany(models.question, {
        foreignKey: "electionid",
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
