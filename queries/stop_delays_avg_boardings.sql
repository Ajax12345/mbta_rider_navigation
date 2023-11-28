with cte as (
  	select t.vehicle_id, t.route, t.stop, max(t.estimated_delay) mdt
	from traffic t
  	where t.estimated_delay/60 < 50
  	group by t.vehicle_id, t.route, t.stop
)
select t1.*, coalesce(t2.riders, 'N/A') average_boarding_rate from (select t.route, t.stop_name, avg(t.mdt/60) average_min_delay from 
	(select c.route, st.stop_name, c.mdt from cte c 
 		left join rail_stops st on st.stop_id = c.stop) t
group by t.route, t.stop_name) t1
left join (select r.route_id, r.stop_id stop_name, avg(cast(r.average_ons as int)) riders 
			from stop_ridership r
			where r.average_load
			group by r.route_id, r.stop_id) t2
on t2.stop_name = t1.stop_name and t2.route_id = t1.route