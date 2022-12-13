import sequelize from '../../src/database/connection.js';
import User from '../../src/database/User.js';
import Strategy from '../../src/database/Strategy.js';
import bcrypt from 'bcrypt';
import { DataTypes } from 'sequelize';

afterAll(() => {
    return sequelize.close();
});

const email = 'sample.username@gmail.com';
const type = 'buyAndHoldSample';
let userId;

describe('Test database.', () => {
    test('Create new User.', async () => {
        const exchangeAuthProd = JSON.stringify({
            binance: {
                APIKey: '98434168',
                secret: '39665732'
            }
        })

        await User.create({
            email,
            password: '12345',
            exchangeAuthProd
        });                           

        const result = await User.findOne({ where: { email }});
        const isRightPassword = await bcrypt.compare('12345', result.password);

        // Used in further tests. Not relevant here.
        userId = result.id;
        
        expect(result.dataValues).toEqual({
            id: expect.any(String),
            email,
            password: isRightPassword ? result.password : false,
            exchangeAuthProd,
            exchangeAuthTest: null,
            sessionToken: null,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date)
        });
    });

    test('Create new Strategy.', async () => {
        let data = JSON.stringify({
            entryParam: 50,
            exitParam: 80,
            indicatorsToUse: [ 'RSI', 'SMA', 'BollingerBands' ]
        });
        const user = await User.findOne({ where: { email }})

        await Strategy.create({
            userId: user.id,
            type,
            data
        });

        const result = await Strategy.findOne({ where: { type }});
        data = JSON.parse(data);
        data.id = result.id;
        data = JSON.stringify(data);

        expect(result.dataValues).toEqual({
            id: expect.any(String),
            type,
            userId: user.id,
            createdAt: expect.any(Date),
            updatedAt: expect.any(Date),
            data
        });
    });

    test('Update User email.', async () => {
        const user = await User.findOne({ where: { email }});
        const previousPassword = user.password;

        user.email = 'newEmail@hotmail.com';
        await user.save();
        await user.reload();

        expect(user.password).toBe(previousPassword);
        expect(user.email).toBe('newEmail@hotmail.com');
    });

    test('Update Strategy.', async () => {
        const strategy = await Strategy.findOne({ where: { type }});
        strategy.type = 'bearMarketDiamondHands';

        await strategy.save();
        await strategy.reload();

        expect(strategy.type).toBe('bearMarketDiamondHands');
    });

    test('Get all Strategies from one User.', async () => {
        const result = await Strategy.findAll({ where: { userId }});

        expect(result.length).toBe(1);
        expect(result[0].type).toBe('bearMarketDiamondHands');
    });

    test('Delete Strategy.', async () => {
        const affectedRows = await Strategy.destroy({ 
            where: { type: 'bearMarketDiamondHands' }
        });
        expect(affectedRows).toBe(1);

        const strategyDeleted = await Strategy.findOne({ 
            where: { type: 'bearMarketDiamondHands' }
        });
        expect(strategyDeleted).toBe(null);
    });

    test('Delete User.', async () => {
        const rowsAffected = await User.destroy({ where: { email: 'newEmail@hotmail.com' }});
        expect(rowsAffected).toBe(1);

        const userDeleted = await User.findOne({ where: { email: 'newEmail@hotmail.com' }});
        expect(userDeleted).toBe(null);
    });
});