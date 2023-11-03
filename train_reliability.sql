with cte as (
  select cast(substr(d.service_date, 1, 4) as int) year, d.* from all_data d
)
select d.year, d.gtfs_route_long_name name, avg(d.otp_numerator/cast(d.otp_denominator as float)) reliability from cte d 
where d.otp_denominator > 0
group by d.year, d.gtfs_route_long_name