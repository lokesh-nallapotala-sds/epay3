using System.Text.Json.Serialization;

public class ScheduledPaymentPolicy
{
    [JsonConverter(typeof(JsonStringEnumConverter))]
    public ScheduleMode Mode { get; init; }
    public string[]? AllowedWeekdays { get; init; }
    public int[]? AllowedMonthDays { get; init; }
}

public enum ScheduleMode { None, Daily, Weekday, Monthly }
