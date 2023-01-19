"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    /**
     * Add altering commands here.
     *
     * Example:
     * await queryInterface.createTable('users', { id: Sequelize.INTEGER });
     */
    await queryInterface.addColumn("answers", "choosenOption", {
      type: Sequelize.DataTypes.INTEGER,
      allowNull: false,
    });
    await queryInterface.addConstraint("answers", {
      fields: ["choosenOption"],
      type: "foreign key",
      references: {
        table: "Options",
        field: "id",
      },
    });

    await queryInterface.addColumn("answers", "questionId", {
      type: Sequelize.DataTypes.INTEGER,
      onDelete: "CASCADE",
    });
    await queryInterface.addConstraint("answers", {
      fields: ["questionId"],
      type: "foreign key",
      onDelete: "CASCADE",
      references: {
        table: "questions",
        field: "id",
      },
    });

    await queryInterface.addColumn("answers", "electionId", {
      type: Sequelize.DataTypes.INTEGER,
      onDelete: "CASCADE",
    });
    await queryInterface.addConstraint("answers", {
      fields: ["electionId"],
      type: "foreign key",
      onDelete: "CASCADE",
      references: {
        table: "Elections",
        field: "id",
      },
    });

    await queryInterface.addColumn("answers", "voterId", {
      type: Sequelize.DataTypes.INTEGER,
      onDelete: "CASCADE",
    });
    await queryInterface.addConstraint("answers", {
      fields: ["voterId"],
      type: "foreign key",
      onDelete: "CASCADE",
      references: {
        table: "VoterRels",
        field: "id",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("answers", "voterId");
    await queryInterface.removeColumn("answers", "electionId");
    await queryInterface.removeColumn("answers", "questionId");
    await queryInterface.removeColumn("answers", "choosenOption");
    /**
     * Add reverting commands here.
     *
     * Example:
     * await queryInterface.dropTable('users');
     */
  },
};
