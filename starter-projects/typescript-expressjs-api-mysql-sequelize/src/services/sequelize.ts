import { Sequelize } from 'sequelize';

export const sequelize = new Sequelize(process.env.DB_CONNECTION_STRING, {
  dialect: 'mysql',
  pool: { max: Number(process.env.CONNECTION_POOL_SIZE || 5) },
});

export const syncDbModel = () => {
  return sequelize.sync();
};
