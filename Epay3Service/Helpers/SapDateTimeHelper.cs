namespace Epay3Service.Helpers;

internal static class SapDateTimeHelper
{
    internal static DateTime? SapDateAndTimeToDateTime(string sapDate, string sapTime)
    {
        if (!string.IsNullOrEmpty(sapDate) && sapDate != "00000000" &&
            !string.IsNullOrEmpty(sapTime) && sapTime != "000000")
        {
            var year = int.Parse(sapDate.Substring(0, 4));
            var month = int.Parse(sapDate.Substring(4, 2));
            var day = int.Parse(sapDate.Substring(6, 2));
            var hours = int.Parse(sapTime.Substring(0, 2));
            var minutes = int.Parse(sapTime.Substring(2, 2));
            var seconds = int.Parse(sapTime.Substring(4, 2));

            return new DateTime(year, month, day, hours, minutes, seconds);
        }

        return null;
    }

    internal static DateTime? SapDateAndTimeToDateTime(string sapDate)
    {
        if (!string.IsNullOrEmpty(sapDate) && sapDate != "00000000")
        {
            var year = int.Parse(sapDate.Substring(0, 4));
            var month = int.Parse(sapDate.Substring(4, 2));
            var day = int.Parse(sapDate.Substring(6, 2));
            var hours = 0;
            var minutes = 0;
            var seconds = 0;

            return new DateTime(year, month, day, hours, minutes, seconds);
        }

        return null;
    }
}
