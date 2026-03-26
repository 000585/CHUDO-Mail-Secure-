import analysisDao from '../dao/analysis-dao.js';
import { toUtc } from '../utils/date-utils.js';

const analysisService = {
    async echarts(c, params) {
        const { timeZone } = params;
        // ИСПРАВЛЕНО: Валидация timeZone
        const validTimeZones = ['UTC', 'Asia/Shanghai', 'America/New_York', 'Europe/London', 'Europe/Paris', 'Asia/Tokyo'];
        const safeTimeZone = validTimeZones.includes(timeZone) ? timeZone : 'UTC';
        
        const diffHours = toUtc().tz(safeTimeZone).utcOffset() / 60;

        const [numberCount, userDayCount, receiveDayCount, sendDayCount] = await Promise.all([
            analysisDao.numberCount(c),
            analysisDao.userDayCount(c, diffHours),
            analysisDao.receiveDayCount(c, diffHours),
            analysisDao.sendDayCount(c, diffHours)
        ]);

        return {
            numberCount,
            userDayCount,
            receiveDayCount,
            sendDayCount
        };
    }
};

export default analysisService;
