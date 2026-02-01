<html>
 <head>
  <title>38 Mishawum</title>
 </head>
<body>
<?php
        $connection = new SQLite3('/var/lib/weewx/weewx.sdb');
        $query1 = "
                SELECT
                        datetime(datetime,'unixepoch','localtime') as datetime,
                        round(inTemp,1) as inTemp,
                        round(inHumidity,1) as inHumidity
                FROM
                        archive
                WHERE
                        datetime in (select datetime from archive where inTemp is not null order by datetime desc limit 3)
                ORDER BY
                        datetime desc
                ";
        $query2 = "
                SELECT
                        datetime(datetime,'unixepoch','localtime') as datetime,
                        round(extraTemp1,1) as extraTemp1,
                        round(extraHumid1,1) as extraHumid1
                FROM
                        archive
                WHERE
                        datetime in (select datetime from archive where extraTemp1 is not null order by datetime desc limit 3)
                ORDER BY
                        datetime desc
                ";
        $query3 = "
                SELECT
                        datetime(datetime,'unixepoch','localtime') as datetime,
                        round(extraTemp2,1) as extraTemp2,
                        round(extraHumid2,1) as extraHumid2
                FROM
                        archive
                WHERE
                        datetime in (select datetime from archive where extraTemp2 is not null order by datetime desc limit 3)
                ORDER BY
                        datetime desc
                ";
        $results = $connection->query($query1);
        echo '<table>';
        echo '<tr><td>Kitchen - Sensor 1</td></tr>';
        echo '<tr><td>DateTime</td><td>Temp</td><td>Humidity</td></tr>';
        while($row=$results->fetchArray(SQLITE3_ASSOC)){
                echo '<tr>';
                echo "<td>$row[datetime]</td><td>$row[inTemp]</td><td>$row[inHumidity]</td>";
        }
        echo '</table>';
        $results = $connection->query($query2);
        echo '<br>';
        echo '<table>';
        echo '<tr><td>2nd Bedroom - Sensor 2</td></tr>';
        echo '<tr><td>DateTime</td><td>Temp</td><td>Humidity</td><tr>';
        while($row=$results->fetchArray(SQLITE3_ASSOC)){
                echo '<tr>';
                echo "<td>$row[datetime]</td><td>$row[extraTemp1]</td><td>$row[extraHumid1]</td>";
        }
        echo '</table>';
        $results = $connection->query($query3);
        echo '<br>';
        echo '<table>';
        echo '<tr><td>Edwins Room - Sensor 3</td></tr>';
        echo '<tr><td>DateTime</td><td>Temp</td><td>Humidity</td><tr>';
        while($row=$results->fetchArray(SQLITE3_ASSOC)){
                echo '<tr>';
                echo "<td>$row[datetime]</td><td>$row[extraTemp2]</td><td>$row[extraHumid2]</td>";
        }
        echo '</table>'; ?>
</body>
</html>
