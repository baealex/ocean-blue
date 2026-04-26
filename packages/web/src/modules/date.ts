import { handyDate } from '@baejino/handy';

export const formatDate = (dateString: string): string => {
    if (!dateString) return 'Never';
    return handyDate.format(new Date(Number(dateString)), 'YYYY-MM-DD HH:mm:ss');
};
