import { Sequelize } from 'sequelize';

let sequelize: Sequelize;

export const getSequelizeInstance = () => {
  if (sequelize) {
    return sequelize;
  }
  sequelize = new Sequelize(process.env.DB_CONNECTION_STRING, {
    pool: { max: Number(process.env.CONNECTION_POOL_SIZE || 5) }
  });
  return sequelize;
};

export const syncDbModel = () => {
  return sequelize.sync();
};
