const userContext = {
    getUserId(c) {
        return c.get('userId');
    },
    setUserId(c, userId) {
        c.set('userId', userId);
    },
    getToken(c) {
        const authHeader = c.req.header('Authorization');
        return authHeader ? authHeader.replace('Bearer ', '').trim() : '';
    }
};

export default userContext;
