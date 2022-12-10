import sequelize from './connection.js';
import { DataTypes, Model } from 'sequelize';

class Strategy extends Model {}

Strategy.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    userId: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
            model: 'users',
            key: 'id'
        }
    },
    type: {
        type: DataTypes.STRING,
        allowNull: false
    },
    data: {
        type: DataTypes.JSON,
        allowNull: false
    }
}, {
    sequelize,
    modelName: 'strategy',
    tableName: 'strategies'
});

Strategy.beforeCreate(strategy => {
    let data = JSON.parse(strategy.data);
    data.id = strategy.id;
    strategy.data = JSON.stringify(data);
});

await Strategy.sync();

export default Strategy;