select l.service_effect_text, l.cause_name, count(*) freq, avg(l.severity_code) severity 
from service_alerts l
where lower(l.effect_name) = 'delay' 
	and exists (select 1 from lines l1 where l1.name = l.service_effect_text)
    and l.severity_code > 1
group by l.service_effect_text, l.cause_name