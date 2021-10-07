import { DataTypes } from 'sequelize';
import { sequelize } from '../services/sequelize';

export const Post = sequelize.define('Post', {
  title: {
    type: DataTypes.STRING,
    unique: true,
  },
  content: DataTypes.TEXT,
  authorEmail: DataTypes.STRING,
});
