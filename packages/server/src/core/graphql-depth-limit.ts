import { GraphQLError, Kind, type ASTNode, type ASTVisitor, type ValidationContext } from 'graphql';

function isFieldAncestor(ancestor: ASTNode | readonly ASTNode[]): ancestor is ASTNode {
    return !Array.isArray(ancestor) && (ancestor as ASTNode).kind === Kind.FIELD;
}

export function depthLimitRule(maxDepth: number) {
    return (context: ValidationContext): ASTVisitor => {
        return {
            Field: {
                enter(node, _key, _parent, _path, ancestors) {
                    const depth = ancestors.filter(isFieldAncestor).length;

                    if (depth >= maxDepth) {
                        context.reportError(
                            new GraphQLError(`Query depth limit of ${maxDepth} exceeded`, { nodes: [node] })
                        );
                    }
                }
            }
        };
    };
}
