export const verifyAdmin = (req, res, next) => {
    if (!req.user || (req.user.role !== 'admin' && req.user.role !== 'supervisor')) {
        return res.status(403).json({ error: 'Access forbidden: Admin privileges required.' });
    }
    next();
};