import { makeExecutableSchema } from '@graphql-tools/schema';
import { tunnelTokenResolvers, tunnelTokenTypeDefs } from '~/features/tunnel/graphql/index.js';

const schema = makeExecutableSchema({
    typeDefs: [
        tunnelTokenTypeDefs
    ],
    resolvers: [
        tunnelTokenResolvers
    ]
});

export default schema;
