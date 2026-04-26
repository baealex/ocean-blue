import type { Controller } from '~/types/index.js';

export const home: Controller = async (req, res) => {
    res.send('Hello, My Express JS!\n').end();
};
