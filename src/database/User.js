import sequelize from './connection.js';
import { DataTypes, Model } from 'sequelize';
import bcrypt from 'bcrypt';

class User extends Model {
    static subscribers = [];
    static subscribe(id, callback) { this.subscribers[id] = callback }
    static unsubscribe(id) { delete this.subscribers[id] }
    static notify(newId) {
        Object.values(this.subscribers).forEach(callback => {
            callback(newId);
        });
    }    
}

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
    exchangeAuthProd: {
        type: DataTypes.JSON,
        defaultValue: '{}'
    },
    exchangeAuthTest: {
        type: DataTypes.JSON,
        defaultValue: '{}'
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
    User.notify(user.id);
});

await User.sync();

export default User;