import { test } from "node:test";
import assert from "node:assert/strict";
import { quoteReward, completionReward, localDay, earnedBadges, rewardSummary } from "../lib/rewards.ts";
const resident = { id: "r", phone: "+85260000001" }, volunteer = { id: "v", phone: "+85260000002" };
const request = { id: "request", volunteerId: "v", status: "ACCEPTED", dispatch_action: "NEIGHBORHOOD_VOLUNTEER", urgency_level: "LOW" };
const event = (id, time, points = 5) => ({ requestId: String(id), volunteerId: "v", points, urgency: "LOW", ruleVersion: 1, earnedAt: time });

test("5/10/15 offers are frozen; emergencies, own accounts and legacy tasks earn nothing", () => {
  for (const [urgency, points] of [["LOW",5],["MEDIUM",10],["HIGH",15],["NOT_ASSESSED",5]]) assert.equal(quoteReward({...request,urgency_level:urgency},resident,volunteer).points,points);
  assert.equal(quoteReward({...request,dispatch_action:"EMERGENCY_medical"},resident,volunteer).points,0);
  assert.equal(quoteReward(request,resident,{...volunteer,phone:resident.phone}).points,0);
  assert.equal(completionReward(request,resident,volunteer),undefined);
  const frozen={...request,rewardQuote:quoteReward(request,resident,volunteer),urgency_level:"HIGH"};
  assert.equal(completionReward(frozen,resident,volunteer).points,5);
  assert.equal(completionReward({...frozen,status:"CLOSED"},resident,volunteer),undefined);
  assert.equal(completionReward({...frozen,status:"PENDING"},resident,volunteer),undefined);
  assert.equal(completionReward(frozen,resident,{...volunteer,phone:resident.phone}),undefined);
});

test("Hong Kong midnight, deduplicated helping days, missed days and permanent streak awards", () => {
  assert.equal(localDay("2026-10-01T15:59:59Z"),"2026-10-01");
  assert.equal(localDay("2026-10-01T16:00:00Z"),"2026-10-02");
  const events=[event(1,"2026-10-01T12:00:00Z"),event(2,"2026-10-01T13:00:00Z"),event(3,"2026-10-02T12:00:00Z"),event(4,"2026-10-03T12:00:00Z")];
  const badges=earnedBadges(events,Date.parse("2026-10-03T14:00:00Z"));
  let summary=rewardSummary(events,badges,Date.parse("2026-10-04T00:00:00Z"));
  assert.equal(summary.currentStreak,3);assert.equal(summary.monthly.days,3);
  summary=rewardSummary(events,badges,Date.parse("2026-10-05T00:00:00Z"));
  assert.equal(summary.currentStreak,0);assert.equal(summary.longestStreak,3);
  assert(summary.badges.find(b=>b.code==="streak:3").earnedAt);
  assert.equal(summary.badges.find(b=>b.code==="streak:7").earnedAt,undefined);
});

test("monthly progress resets; earned monthly badges and lifetime 100/200/300 milestones remain", () => {
  const events=Array.from({length:300},(_,i)=>event(i,`2026-09-${String(1+i%25).padStart(2,"0")}T12:00:00Z`));
  const unlocks=earnedBadges(events,Date.parse("2026-10-01T00:00:00Z"));
  const summary=rewardSummary(events,unlocks,Date.parse("2026-10-01T00:00:00Z"));
  assert.equal(summary.helps,300);assert.equal(summary.points,1500);
  assert.deepEqual(summary.monthly,{helps:0,days:0,points:0});
  assert.equal(summary.pastMonthly.length,3);
  for(const target of [100,200,300])assert(summary.badges.find(b=>b.code==="helps:"+target).earnedAt);
  assert.equal(summary.challenges.filter(b=>b.earnedAt).length,0);
});

test("each monthly challenge unlocks at its own threshold, with no bonus points", () => {
  const events=Array.from({length:5},(_,i)=>event(i,`2026-10-0${1+Math.min(i,3)}T12:00:00Z`,10));
  const now=Date.parse("2026-10-05T00:00:00Z"),badges=earnedBadges(events,now),s=rewardSummary(events,badges,now);
  assert.equal(s.points,50);assert.equal(s.monthly.days,4);assert.equal(s.challenges.filter(b=>b.earnedAt).length,3);
  assert.equal(earnedBadges(events.slice(0,3),now).filter(b=>b.code.startsWith("monthly:")).length,0);
  assert.equal(rewardSummary([],[],now).helps,0);
});
