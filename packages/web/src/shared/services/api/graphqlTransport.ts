type CsrfSessionResponse = { csrfToken?: string };

export type GraphQLVariables = Record<string, unknown>;

type GraphQLErrorResponse = {
    errors?: Array<{ message?: string }>;
};

type GraphQLResponse<T> = GraphQLErrorResponse & {
    data?: T;
};

async function readCsrfToken() {
    const response = await fetch('/api/auth/session', { credentials: 'include' });
    if (!response.ok) return undefined;

    const session = await response.json() as CsrfSessionResponse;
    return session.csrfToken;
}

const isMutation = (query: string) => /^\s*mutation\b/.test(query);

export async function fetchGraphQL<T>(query: string, variables: GraphQLVariables = {}): Promise<T> {
    const csrfToken = isMutation(query) ? await readCsrfToken() : undefined;
    const response = await fetch('/graphql', {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            ...(csrfToken ? { 'x-csrf-token': csrfToken } : {})
        },
        body: JSON.stringify({
            query,
            variables
        })
    });

    const json = await response.json() as GraphQLResponse<T>;

    if (json.errors?.length) {
        throw new Error(json.errors[0]?.message ?? 'GraphQL request failed');
    }

    return json.data as T;
}
