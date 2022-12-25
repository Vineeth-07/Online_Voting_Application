"use strict";

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.addColumn("elections", "adminid", {
      type: Sequelize.DataTypes.INTEGER,
    });
    await queryInterface.addConstraint("elections", {
      fields: ["adminid"],
      type: "foreign key",
      references: {
        table: "admins",
        field: "id",
      },
    });
  },

  async down(queryInterface, Sequelize) {
    await queryInterface.removeColumn("elections", "adminid");
  },
};
