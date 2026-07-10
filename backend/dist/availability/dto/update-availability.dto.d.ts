export declare class AvailabilitySlotDto {
    dayOfWeek: number;
    startTime: string;
    endTime: string;
}
export declare class UpdateAvailabilityDto {
    slots: AvailabilitySlotDto[];
}
