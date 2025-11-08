import axios from 'axios';
import dotenv from 'dotenv';

dotenv.config();

const BASE_URL = process.env.API_BASE_URL || 'http://localhost:3000';

// Helper function to make authenticated API calls
async function apiCall(method: 'GET' | 'POST' | 'PUT' | 'DELETE', endpoint: string, token: string, data?: any) {
    try {
        const config: any = {
            method,
            url: `${BASE_URL}${endpoint}`,
            headers: {
                'Content-Type': 'application/json',
                ...(token && { 'Authorization': `Bearer ${token}` })
            }
        };
        if (data) {
            config.data = data;
        }
        const response = await axios(config);
        return response.data;
    } catch (error: any) {
        console.error(`Error ${method} ${endpoint}:`, error.response?.data || error.message);
        throw error;
    }
}

// Helper to add delay between requests
const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms));

async function populateDummyData() {
    console.log('🚀 Starting dummy data population...\n');

    try {
        // Step 1: Sign up a user
        console.log('📝 Creating user account...');
        const signupData = {
            name: 'Test User',
            email: 'test@example.com',
            password: 'test123456'
        };

        let token: string;
        try {
            const signupResponse = await apiCall('POST', '/auth/signup', '', signupData);
            token = signupResponse.token;
            console.log('✅ User created successfully\n');
        } catch (error: any) {
            if (error.response?.status === 409 || error.response?.status === 400) {
                // User already exists, try to login
                console.log('⚠️  User already exists, logging in...');
                const loginResponse = await apiCall('POST', '/auth/login', '', {
                    email: signupData.email,
                    password: signupData.password
                });
                token = loginResponse.token;
                console.log('✅ Logged in successfully\n');
            } else {
                throw error;
            }
        }

        // Step 2: Update user preferences to set INR as base currency
        console.log('⚙️  Updating user preferences...');
        await apiCall('PUT', '/user/preferences', token, {
            baseCurrency: 'INR',
            monthlyIncome: 150000
        });
        console.log('✅ User preferences updated\n');
        await delay(500);

        // Step 3: Create bank accounts
        console.log('🏦 Creating bank accounts...');
        const bankAccounts = [
            { name: 'HDFC Savings', type: 'SAVINGS', balance: 250000, currency: 'INR' },
            { name: 'ICICI Current', type: 'CURRENT', balance: 50000, currency: 'INR' },
            { name: 'SBI Credit Card', type: 'CREDIT_CARD', balance: 0, currency: 'INR' }
        ];

        const createdAccounts: any[] = [];
        for (const account of bankAccounts) {
            const accountResponse = await apiCall('POST', '/bank-accounts', token, account);
            createdAccounts.push(accountResponse);
            console.log(`✅ Created account: ${account.name}`);
            await delay(300);
        }
        console.log('✅ All bank accounts created\n');

        // Step 4: Create historical transactions (last 6 months)
        console.log('💰 Creating historical transactions...');
        const now = new Date();
        const transactions: any[] = [];

        // Generate transactions for the last 6 months
        for (let monthOffset = 0; monthOffset < 6; monthOffset++) {
            const monthDate = new Date(now.getFullYear(), now.getMonth() - monthOffset, 1);

            // Income transactions (salary)
            transactions.push({
                amount: 150000,
                currency: 'INR',
                category: 'OTHER',
                type: 'INCOME',
                description: `Salary for ${monthDate.toLocaleString('default', { month: 'long', year: 'numeric' })}`,
                date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString(),
                bankAccountId: createdAccounts[0].id
            });

            // Grocery expenses (multiple per month)
            for (let i = 0; i < 8; i++) {
                transactions.push({
                    amount: 2000 + Math.random() * 3000,
                    currency: 'INR',
                    category: 'GROCERY',
                    type: 'EXPENSE',
                    description: `Grocery shopping - Week ${i + 1}`,
                    date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 + i * 3).toISOString(),
                    bankAccountId: createdAccounts[0].id
                });
            }

            // Utility bills
            transactions.push({
                amount: 5000,
                currency: 'INR',
                category: 'UTILITIES',
                type: 'EXPENSE',
                description: 'Electricity bill',
                date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5).toISOString(),
                bankAccountId: createdAccounts[0].id
            });

            transactions.push({
                amount: 2000,
                currency: 'INR',
                category: 'UTILITIES',
                type: 'EXPENSE',
                description: 'Internet bill',
                date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 10).toISOString(),
                bankAccountId: createdAccounts[0].id
            });

            // Transportation expenses
            for (let i = 0; i < 20; i++) {
                transactions.push({
                    amount: 100 + Math.random() * 400,
                    currency: 'INR',
                    category: 'TRANSPORTATION',
                    type: 'EXPENSE',
                    description: `Uber/Ola ride`,
                    date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1 + i * 1.5).toISOString(),
                    bankAccountId: createdAccounts[0].id
                });
            }

            // Entertainment expenses
            for (let i = 0; i < 4; i++) {
                transactions.push({
                    amount: 2000 + Math.random() * 3000,
                    currency: 'INR',
                    category: 'ENTERTAINMENT',
                    type: 'EXPENSE',
                    description: `Movie/Dinner/Concert`,
                    date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5 + i * 7).toISOString(),
                    bankAccountId: createdAccounts[0].id
                });
            }

            // Healthcare expenses
            for (let i = 0; i < 2; i++) {
                transactions.push({
                    amount: 1500 + Math.random() * 2000,
                    currency: 'INR',
                    category: 'HEALTHCARE',
                    type: 'EXPENSE',
                    description: `Pharmacy/Doctor visit`,
                    date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 10 + i * 10).toISOString(),
                    bankAccountId: createdAccounts[0].id
                });
            }

            // Clothing expenses
            for (let i = 0; i < 2; i++) {
                transactions.push({
                    amount: 3000 + Math.random() * 5000,
                    currency: 'INR',
                    category: 'CLOTHING',
                    type: 'EXPENSE',
                    description: `Clothing purchase`,
                    date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 15 + i * 10).toISOString(),
                    bankAccountId: createdAccounts[0].id
                });
            }

            // Rent (if applicable)
            if (monthOffset < 3) {
                transactions.push({
                    amount: 25000,
                    currency: 'INR',
                    category: 'RENT',
                    type: 'EXPENSE',
                    description: 'Monthly rent',
                    date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 1).toISOString(),
                    bankAccountId: createdAccounts[0].id
                });
            }

            // Other expenses
            for (let i = 0; i < 5; i++) {
                transactions.push({
                    amount: 1000 + Math.random() * 4000,
                    currency: 'INR',
                    category: 'OTHER',
                    type: 'EXPENSE',
                    description: `Miscellaneous expense ${i + 1}`,
                    date: new Date(monthDate.getFullYear(), monthDate.getMonth(), 5 + i * 5).toISOString(),
                    bankAccountId: createdAccounts[0].id
                });
            }
        }

        // Create transactions in batches
        console.log(`Creating ${transactions.length} transactions...`);
        let createdCount = 0;
        for (const transaction of transactions) {
            try {
                await apiCall('POST', '/transactions', token, transaction);
                createdCount++;
                if (createdCount % 50 === 0) {
                    console.log(`✅ Created ${createdCount} transactions...`);
                }
                await delay(100); // Small delay to avoid overwhelming the server
            } catch (error) {
                console.error(`Failed to create transaction: ${transaction.description}`);
            }
        }
        console.log(`✅ Created ${createdCount} transactions\n`);

        // Step 5: Create US stock holdings
        console.log('📈 Creating US stock holdings...');
        const holdings = [
            {
                platform: 'Interactive Brokers',
                ticker: 'AAPL',
                assetType: 'STOCK',
                name: 'Apple Inc.',
                quantity: 10,
                avgCost: 175.50,
                holdingCurrency: 'USD'
            },
            {
                platform: 'Interactive Brokers',
                ticker: 'GOOGL',
                assetType: 'STOCK',
                name: 'Alphabet Inc.',
                quantity: 5,
                avgCost: 140.25,
                holdingCurrency: 'USD'
            },
            {
                platform: 'Interactive Brokers',
                ticker: 'MSFT',
                assetType: 'STOCK',
                name: 'Microsoft Corporation',
                quantity: 8,
                avgCost: 380.00,
                holdingCurrency: 'USD'
            },
            {
                platform: 'Interactive Brokers',
                ticker: 'TSLA',
                assetType: 'STOCK',
                name: 'Tesla Inc.',
                quantity: 15,
                avgCost: 250.75,
                holdingCurrency: 'USD'
            },
            {
                platform: 'Interactive Brokers',
                ticker: 'AMZN',
                assetType: 'STOCK',
                name: 'Amazon.com Inc.',
                quantity: 6,
                avgCost: 150.00,
                holdingCurrency: 'USD'
            },
            {
                platform: 'Interactive Brokers',
                ticker: 'NVDA',
                assetType: 'STOCK',
                name: 'NVIDIA Corporation',
                quantity: 12,
                avgCost: 450.50,
                holdingCurrency: 'USD'
            }
        ];

        for (const holding of holdings) {
            try {
                await apiCall('POST', '/holdings', token, holding);
                console.log(`✅ Created holding: ${holding.name} (${holding.ticker})`);
                await delay(500);
            } catch (error) {
                console.error(`Failed to create holding: ${holding.name}`);
            }
        }
        console.log('✅ All holdings created\n');

        // Step 6: Create financial goals
        console.log('🎯 Creating financial goals...');
        const goals = [
            {
                name: 'Emergency Fund',
                description: 'Build 6 months of expenses as emergency fund',
                targetAmount: 900000,
                savedAmount: 250000,
                targetDate: new Date(now.getFullYear() + 1, now.getMonth(), 1).toISOString()
            },
            {
                name: 'Vacation to Europe',
                description: 'Save for a 2-week vacation to Europe',
                targetAmount: 500000,
                savedAmount: 150000,
                targetDate: new Date(now.getFullYear(), now.getMonth() + 6, 1).toISOString()
            },
            {
                name: 'New Car',
                description: 'Down payment for a new car',
                targetAmount: 800000,
                savedAmount: 200000,
                targetDate: new Date(now.getFullYear() + 1, now.getMonth() + 3, 1).toISOString()
            },
            {
                name: 'Home Down Payment',
                description: 'Save for home down payment',
                targetAmount: 5000000,
                savedAmount: 500000,
                targetDate: new Date(now.getFullYear() + 3, now.getMonth(), 1).toISOString()
            }
        ];

        for (const goal of goals) {
            try {
                await apiCall('POST', '/goals', token, goal);
                console.log(`✅ Created goal: ${goal.name}`);
                await delay(300);
            } catch (error) {
                console.error(`Failed to create goal: ${goal.name}`);
            }
        }
        console.log('✅ All goals created\n');

        // Step 7: Create budgets
        console.log('📊 Creating budgets...');
        const budgets = [
            { category: 'GROCERY', amount: 20000, period: 'MONTHLY' },
            { category: 'TRANSPORTATION', amount: 8000, period: 'MONTHLY' },
            { category: 'ENTERTAINMENT', amount: 10000, period: 'MONTHLY' },
            { category: 'UTILITIES', amount: 7000, period: 'MONTHLY' },
            { category: 'HEALTHCARE', amount: 5000, period: 'MONTHLY' },
            { category: 'CLOTHING', amount: 6000, period: 'MONTHLY' }
        ];

        for (const budget of budgets) {
            try {
                await apiCall('POST', '/budgets', token, budget);
                console.log(`✅ Created budget: ${budget.category} - ₹${budget.amount}/${budget.period}`);
                await delay(300);
            } catch (error) {
                console.error(`Failed to create budget: ${budget.category}`);
            }
        }
        console.log('✅ All budgets created\n');

        // Step 8: Create planned events
        console.log('📅 Creating planned events...');
        const plannedEvents = [
            {
                name: 'Annual Insurance Premium',
                targetDate: new Date(now.getFullYear(), now.getMonth() + 2, 15).toISOString(),
                estimatedCost: 50000,
                savedSoFar: 20000,
                currency: 'INR',
                category: 'OTHER',
                recurrence: 'YEARLY'
            },
            {
                name: 'Car Service',
                targetDate: new Date(now.getFullYear(), now.getMonth() + 1, 20).toISOString(),
                estimatedCost: 15000,
                savedSoFar: 10000,
                currency: 'INR',
                category: 'TRANSPORTATION',
                recurrence: 'ONE_TIME'
            },
            {
                name: 'Dental Checkup',
                targetDate: new Date(now.getFullYear(), now.getMonth() + 3, 10).toISOString(),
                estimatedCost: 5000,
                savedSoFar: 3000,
                currency: 'INR',
                category: 'HEALTHCARE',
                recurrence: 'ONE_TIME'
            },
            {
                name: 'Festival Shopping',
                targetDate: new Date(now.getFullYear(), now.getMonth() + 4, 1).toISOString(),
                estimatedCost: 30000,
                savedSoFar: 15000,
                currency: 'INR',
                category: 'CLOTHING',
                recurrence: 'ONE_TIME'
            }
        ];

        for (const event of plannedEvents) {
            try {
                await apiCall('POST', '/planned-events', token, event);
                console.log(`✅ Created planned event: ${event.name}`);
                await delay(300);
            } catch (error) {
                console.error(`Failed to create planned event: ${event.name}`);
            }
        }
        console.log('✅ All planned events created\n');

        console.log('🎉 Dummy data population completed successfully!');
        console.log('\n📋 Summary:');
        console.log(`   - User: ${signupData.email}`);
        console.log(`   - Bank Accounts: ${bankAccounts.length}`);
        console.log(`   - Transactions: ${createdCount}`);
        console.log(`   - Holdings: ${holdings.length}`);
        console.log(`   - Goals: ${goals.length}`);
        console.log(`   - Budgets: ${budgets.length}`);
        console.log(`   - Planned Events: ${plannedEvents.length}`);
        console.log('\n💡 You can now test the AI feature with questions like:');
        console.log('   - "What was my total spending last month?"');
        console.log('   - "How much did I spend on groceries this year?"');
        console.log('   - "What are my biggest expenses?"');
        console.log('   - "How much did I earn in the last 3 months?"');

    } catch (error: any) {
        console.error('❌ Error populating dummy data:', error.message);
        process.exit(1);
    }
}

// Run the script
populateDummyData();

