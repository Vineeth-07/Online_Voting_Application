"use strict";
const { Model } = require("sequelize");
module.exports = (sequelize, DataTypes) => {
  class Election extends Model {
    /**
     * Helper method for defining associations.
     * This method is not a part of Sequelize lifecycle.
     * The `models/index` file will call this method automatically.
     */
    static createElection({ electionName, adminID, publicurl }) {
      let createElection = this.create({
        electionName,
        publicurl,
        adminID,
      });
      return createElection;
    }

    static retriveElections(adminID) {
      let retriveElections = this.findAll({
        where: {
          adminID,
        },
        order: [["id", "ASC"]],
      });
      return retriveElections;
    }

    static retriveElection(id) {
      let retriveElection = this.findOne({
        where: {
          id,
        },
      });
      return retriveElection;
    }

    static launchElection(id) {
      let launchElection = this.update(
        {
          launched: true,
          ended: false,
        },
        {
          where: {
            id: id,
          },
        }
      );
      return launchElection;
    }

    static endElection(id) {
      let endElection = this.update(
        {
          launched: false,
          ended: true,
        },
        {
          where: {
            id: id,
          },
        }
      );
      return endElection;
    }

    static retriveUrl(publicurl) {
      let retriveUrl = this.findOne({
        where: {
          publicurl,
        },
      });
      return retriveUrl;
    }

    static associate(models) {
      // define association here
      Election.belongsTo(models.admin, {
        foreignKey: "adminID",
      });

      Election.hasMany(models.questions, {
        foreignKey: "electionId",
      });

      Election.hasMany(models.VoterRel, {
        foreignKey: "electionId",
      });
      Election.hasMany(models.answer, {
        foreignKey: "electionId",
        onDelete: "CASCADE",
      });
    }
  }
  Election.init(
    {
      electionName: DataTypes.STRING,
      launched: DataTypes.BOOLEAN,
      ended: DataTypes.BOOLEAN,
      publicurl: DataTypes.STRING,
    },
    {
      sequelize,
      modelName: "Election",
    }
  );
  return Election;
};
