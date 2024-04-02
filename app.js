require('dotenv').config()
const express = require('express')
const app = express()
const mongoose = require('mongoose')   
const cookieParser = require('cookie-parser')
const VitalSign = require('./models/vitalsign')
const { graphqlHTTP } = require('express-graphql')
const { GraphQLSchema, GraphQLObjectType, GraphQLString, GraphQLList, GraphQLNonNull, GraphQLID, GraphQLFloat } = require('graphql')

const cors = require('cors');
const User = require('./models/user');
const { createToken } = require('./utility/utils');
const PORT = process.env.PORT;

// MongoDB Connection
mongoose.connect(process.env.DB_URI)
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.log(err));


// GraphQL Types
const UserType = new GraphQLObjectType({
    name: 'User',
    fields: () => ({
        id: { type: GraphQLString },
        email: { type: GraphQLString },
        username: { type: GraphQLString },
        name: { type: GraphQLString },
        role: { type: GraphQLString },
        // Add more fields as necessary
    })
});

const VitalSignType = new GraphQLObjectType({
    name: 'VitalSign',
    fields: () => ({
        id: { type: GraphQLID },
        patientId: { type: GraphQLID },
        bodyTemperature: { type: GraphQLFloat },
        heartRate: { type: GraphQLFloat },
        bloodPressure: { type: GraphQLString },
        dateRecorded: { type: GraphQLString },
        // Include other fields as necessary
    }),
});

// RootQuery
const RootQuery = new GraphQLObjectType({
    name: 'Query',
    fields: {
        user: {
            type: UserType,
            description: 'A single user',
            args: { id: { type: GraphQLNonNull(GraphQLString) } },
            resolve: async (parent, args) => {
                return await User.findById(args.id);
            }
        },
        users: {
            type: new GraphQLList(UserType),
            description: 'List of Users',
            resolve: async () => {
                return await User.find();
            }
        },
        userByEmail: {
            type: UserType,
            description: 'Get a user by their email',
            args: { email: { type: GraphQLNonNull(GraphQLString) } },
            resolve: async (parent, { email }) => {
                return await User.findOne({ email: email });
            }
        },
        vitalSign: {
            type: VitalSignType,
            description: 'A single vital sign record',
            args: { id: { type: GraphQLNonNull(GraphQLID) } },
            resolve: async (_, { id }) => await VitalSign.findById(id),
        },
        vitalSignsByPatient: {
            type: new GraphQLList(VitalSignType),
            description: 'List of all vital signs records for a patient',
            args: { patientId: { type: GraphQLNonNull(GraphQLID) } },
            resolve: async (_, { patientId }) => await VitalSign.find({ patientId }),
        }
        // Add more queries as needed
    }
});

// RootMutation
const RootMutation = new GraphQLObjectType({
    name: 'Mutation',
    fields: {
        // Register a User (Nurse or Patient)
        registerUser: {
            type: UserType,
            description: 'Register a new user',
            args: {
                email: { type: new GraphQLNonNull(GraphQLString) },
                password: { type: new GraphQLNonNull(GraphQLString) },
                name: { type: new GraphQLNonNull(GraphQLString) },
                role: { type: new GraphQLNonNull(GraphQLString) },
                // Add other required fields
            },
            resolve: async (_, args) => {
                const newUser = new User({
                    email: args.email,
                    password: args.password,
                    name: args.name,
                    role: args.role,
                    // Add other fields
                });
                return await newUser.save();
            }
        },

        // Login a User (Nurse or Patient)
        loginUser: {
            type: GraphQLString, // Return a JWT token as a string
            description: 'Login a user and return a token',
            args: {
                email: { type: new GraphQLNonNull(GraphQLString) },
                password: { type: new GraphQLNonNull(GraphQLString) },
            },
            resolve: async (_, { email, password }) => {
                try {
                    const user = await User.login(email, password);
                    // Use the createToken utility to generate a JWT token for the user
                    const token = createToken(user.id, user.role);
                    return token;
                } catch (error) {
                    // Log the error or handle it as needed
                    throw new Error('Login failed: ' + error.message);
                }
            }
        },
        
        // CRUD for Vital Signs
        addVitalSign: {
            type: VitalSignType,
            description: 'Add a vital sign record',
            args: {
                patientId: { type: new GraphQLNonNull(GraphQLID) },
                bodyTemperature: { type: GraphQLFloat },
                heartRate: { type: GraphQLFloat },
                bloodPressure: { type: GraphQLString },
                // Include other vital signs as necessary
            },
            resolve: async (_, args) => {
                const vitalSign = new VitalSign(args);
                return await vitalSign.save();
            },
        },
        updateVitalSign: {
            type: VitalSignType,
            description: 'Update a vital sign record',
            args: {
                id: { type: new GraphQLNonNull(GraphQLID) },
                bodyTemperature: { type: GraphQLFloat },
                heartRate: { type: GraphQLFloat },
                bloodPressure: { type: GraphQLString },
                // Include arguments for other vital signs as necessary
            },
            resolve: async (_, { id, ...update }) => {
                return await VitalSign.findByIdAndUpdate(id, update, { new: true });
            },
        },
        deleteVitalSign: {
            type: VitalSignType,
            description: 'Delete a vital sign record',
            args: { id: { type: new GraphQLNonNull(GraphQLID) } },
            resolve: async (_, { id }) => await VitalSign.findByIdAndDelete(id),
        },

        // Add more mutations as needed
    }
});


const schema = new GraphQLSchema({
    query: RootQuery,
    mutation: RootMutation
});

// CORS configuration
const corsOptions = {
    origin: process.env.CORS_ORIGIN,  // Your frontend origin
    credentials: true, // This allows session cookies to be sent back and forth
};

// Middleware
app.use(cors(corsOptions));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use('/graphql', graphqlHTTP({
    schema: schema,
    graphiql: true, // Set to false if in production
}));

app.listen(PORT, () => console.log(`Server started on port ${PORT}`));