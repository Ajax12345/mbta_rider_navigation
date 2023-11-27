with cte as (
  	select t.vehicle_id, t.route, t.stop, max(t.estimated_delay) mdt
	from traffic t
  	where t.estimated_delay/60 < 50
  	group by t.vehicle_id, t.route, t.stop
)
select t.route, t.stop_name, avg(t.mdt/60) average_min_delay from 
	(select c.route, st.stop_name, c.mdt from cte c 
 		left join rail_stops st on st.stop_id = c.stop) t
where t.route = 'CR-Fitchburg'
group by t.route, t.stop_name