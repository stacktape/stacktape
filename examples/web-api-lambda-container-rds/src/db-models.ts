import { DataTypes } from 'sequelize';
import { getSequelizeInstance } from './utils/sequelize';

const sequelize = getSequelizeInstance();

export const PostModel = sequelize.define('Post', {
  title: DataTypes.STRING,
  content: DataTypes.TEXT,
  author: DataTypes.STRING,
  cacheBustttt: DataTypes.STRING
});
