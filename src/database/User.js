import sequelize from './connection.js';
import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcrypt';

class User extends Model {}

User.init({
    id: {
        type: DataTypes.UUID,
        defaultValue: DataTypes.UUIDV4,
        primaryKey: true
    },
    email: {
        type: DataTypes.STRING,
        allowNull: false,
        unique: true
    },
    password: {
        type: DataTypes.STRING,
        allowNull: false
    },
    exchangeAuth: {
        type: DataTypes.JSON
    },
    sessionToken: {
        type: DataTypes.STRING
    }
},{ 
    sequelize,
    modelName: 'user',
    tableName: 'users'
});

User.beforeCreate(async user => {
    const hashedPassword = await bcrypt.hash(user.password, 10);
    user.password = hashedPassword;    
});

await User.sync();

export default User;