// middleware/authMiddleware.js

export function isAdmin(req, res, next) {
    // Ако потребителят е логнат, винаги го пускай.
    if (req.session && req.session.isAdmin) {
        return next();
    }
    
    // Ако не е логнат И се опитва да достъпи нещо РАЗЛИЧНО от login страницата,
    // го пренасочи към нея.
    if (req.path !== '/login.html') {
         return res.redirect('/admin/login.html');
    }

    // Ако не е логнат, но вече е на login страницата, пусни го.
    return next();
}