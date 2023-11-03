select l.name, coalesce(sum(cancelled_numerator != 0), 0) cancelled from lines l 
left join all_data d on lower(l.name) = lower(d.gtfs_route_long_name)
group by l.name