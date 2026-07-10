import { AnalyticsService } from './analytics.service';
export declare class AnalyticsController {
    private readonly analyticsService;
    constructor(analyticsService: AnalyticsService);
    getDashboardAnalytics(req: any): Promise<{
        stats: {
            title: string;
            value: string;
        }[];
        chartData: {
            name: string;
            bookings: number;
        }[];
    }>;
}
