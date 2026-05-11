"use client";

import React, { useReducer, useEffect, useRef, useState } from 'react';
import { Users, Wheat, Flame, Home, Handshake, Info, ShieldAlert, Dice1, Snowflake } from 'lucide-react';
import { clsx } from 'clsx';
import { twMerge } from 'tailwind-merge';

function cn(...inputs: any[]) {
  return twMerge(clsx(inputs));
}

// --- DATA ---

const MAX_RESOURCES: Record<string, number> = {
  population: 6, food: 10, fuel: 10, shelter: 6, coop: 6,
};

const MINIMAL_CARDS = [
  { id: "stone_sickle", name: "石镰收割", era: "stone", zone: "production", requirement: { type: "min", value: 2 }, effect: [{ type: "addResource", resource: "food", amount: 1 }], bonusEffects: [{condition: {type: "diceAtLeast", value: 4}, effect: [{type: "addResource", resource: "food", amount: 1}]}, {condition: {type: "diceEquals", value: 6}, effect: [{type: "protectResourceLoss", resource: "food", amount: 1}]}], knowledge: "石镰代表早期收割工具，能提高作物采收效率。面对寒潮风险，更高的效率不仅意味着平时温饱，更代表灾前有能力抢收更多救命粮。" },
  { id: "gather_firewood", name: "拾薪备柴", era: "stone", zone: "production", requirement: { type: "min", value: 2 }, effect: [{ type: "addResource", resource: "fuel", amount: 1 }], bonusEffects: [{condition: {type: "diceAtLeast", value: 4}, effect: [{type: "addResource", resource: "fuel", amount: 1}]}, {condition: {type: "diceEquals", value: 6}, effect: [{type: "unfreezeCards", zone: "random", count: 1}]}], knowledge: "柴草是农耕村落抵御寒潮和恢复行动能力的基础资源。严冬里枯木不仅用于取暖，更是解冻僵化工具、让人力重新运转的核心动力。" },
  { id: "pit_dwelling", name: "半地穴居", era: "stone", zone: "building", requirement: { type: "min", value: 2 }, effect: [{ type: "addResource", resource: "shelter", amount: 1 }], bonusEffects: [{condition: {type: "diceEquals", value: 6}, effect: [{type: "preventPopulationLoss", amount: 1}]}], knowledge: "半地穴式居住结构一半在地下，可以利用土壤的保温作用，是早期人类在没有高级供暖方式时，利用环境本身抵御严寒的典型智慧。" },
  { id: "mud_wall_repair", name: "土墙补屋", era: "stone", zone: "building", requirement: { type: "min", value: 3 }, effect: [{ type: "addResource", resource: "shelter", amount: 1 }, { type: "unfreezeCards", zone: "building", count: 1 }], bonusEffects: [{condition: {type: "diceAtLeast", value: 5}, effect: [{type: "unfreezeCards", zone: "random", count: 1}]}, {condition: {type: "diceEquals", value: 6}, effect: [{type: "addResource", resource: "shelter", amount: 1}]}], knowledge: "房屋外墙的维护和修补直接影响寒潮中的居住安全与密封性。风雪倒灌造成的伤亡不亚于单纯的低温，加固住所是常备事务。" },
  { id: "hearth_watch", name: "火塘守夜", era: "stone", zone: "emergency", requirement: { type: "min", value: 2 }, effect: [{ type: "loseResource", resource: "fuel", amount: 1 }, { type: "preventPopulationLoss", amount: 1 }], bonusEffects: [{condition: {type: "diceAtLeast", value: 4}, effect: [{type: "unfreezeCards", zone: "emergency", count: 1}]}, {condition: {type: "diceEquals", value: 6}, effect: [{type: "preventPopulationLoss", amount: 1}]}], knowledge: "火塘取暖是寒潮中保护人口的基础方式。在极其艰难的夜晚，有组织地持续守夜和添柴，是度过最危急关头、防止群体冻伤的关键。" },
  { id: "share_firewood", name: "邻里分柴", era: "stone", zone: "emergency", requirement: { type: "min", value: 3 }, effect: [{ type: "conditional", condition: { type: "resourceAtMost", resource: "fuel", value: 1 }, then: [{ type: "addResource", resource: "fuel", amount: 2 }], else: [{ type: "addResource", resource: "fuel", amount: 1 }] }, { type: "addResource", resource: "coop", amount: 1 }], bonusEffects: [{condition: {type: "diceAtLeast", value: 5}, effect: [{type: "addResource", resource: "fuel", amount: 1}]}], unfreezeBonusEffects: [{condition: {type: "diceInList", values: [1,2]}, effect: [{type: "addResource", resource: "coop", amount: 1}]}], knowledge: "邻里互助能提高小农村落的整体抗灾韧性。即使劳动力低效，但在极端恶劣环境下，将极为有限的燃料资源重新分配，体现了早期社会结构的集体生存本能。" },
  { id: "read_clouds", name: "观云识寒", era: "stone", zone: "info", requirement: { type: "min", value: 2 }, effect: [{ type: "previewNextDisaster" }], bonusEffects: [{condition: {type: "diceEquals", value: 6}, effect: [{type: "addResource", resource: "coop", amount: 1}]}], knowledge: "经验性天气观察能为农事安排争取准备时间。懂得‘云往东、一场空’的气象知识，不仅是玄学，更是农业社会以弱小农具应对巨大灾害的预警机制。" },
  { id: "elder_warning", name: "乡老告急", era: "stone", zone: "info", requirement: { type: "min", value: 3 }, effect: [{ type: "reduceNextRequirement", zone: "emergency", amount: -1, duration: 1 }], bonusEffects: [{condition: {type: "diceAtLeast", value: 5}, effect: [{type: "reduceNextRequirement", zone: "emergency", amount: -1, duration: 1}]}, {condition: {type: "diceEquals", value: 6}, effect: [{type: "unfreezeCards", zone: "emergency", count: 1}]}], knowledge: "乡老代表着村落的经验中心。在通讯极其低效的时代，有威望的长者迅速告急传令，能统筹调配人力应对灾难，大幅提高应急响应的效率。" },
  
  // Reward Cards
  { id: "winter_granary", name: "冬前储粮", era: "stone", zone: "production", requirement: { type: "min", value: 3 }, effect: [{ type: "addResource", resource: "food", amount: 2 }], bonusEffects: [{condition: {type: "diceAtLeast", value: 5}, effect: [{type: "addResource", resource: "food", amount: 1}]}, {condition: {type: "diceEquals", value: 6}, effect: [{type: "protectResourceLoss", resource: "food", amount: 1}]}], knowledge: "农业社会高度依赖季节性收获特性，冬前集中规模储粮是抵御漫长严冬和意外霜冻的唯一可靠基石。储放不当还会导致损耗。" },
  { id: "straw_granary", name: "草棚粮仓", era: "stone", zone: "building", requirement: { type: "min", value: 3 }, effect: [{ type: "protectResourceLoss", resource: "food", amount: 1 }], bonusEffects: [{condition: {type: "diceEquals", value: 6}, effect: [{type: "addResource", resource: "food", amount: 1}]}], knowledge: "构建良好的仓储空间、架高的地板和厚实的草棚覆盖层，能有效阻隔冰雪渗透，大大减少粮食在风雪低温环境中的霉变与过度损耗。" },
  { id: "earth_up_seedlings", name: "培土护苗", era: "stone", zone: "emergency", requirement: { type: "min", value: 4 }, effect: [{ type: "protectResourceLoss", resource: "food", amount: 1 }], bonusEffects: [{condition: {type: "diceEquals", value: 6}, effect: [{type: "protectResourceLoss", resource: "food", amount: 1}]}], knowledge: "在严重霜冻来临之前，人工抢在变天前用泥土覆盖作物根部，能起到极好的保温防冻缓冲作用，这是早期农耕文明最简朴却实用的田间管理智慧。" },
  { id: "inspect_fields", name: "巡田看苗", era: "stone", zone: "info", requirement: { type: "min", value: 4 }, effect: [{ type: "chooseProtection", options: ["food", "shelter"], amount: 1 }], bonusEffects: [{condition: {type: "diceEquals", value: 6}, effect: [{type: "chooseProtection", options: ["food", "shelter"], amount: 1}]}], knowledge: "及时巡查风雪中的田间地头，能够提前察觉冰雪积水和漏风隐患。灾难不会立刻发生，细致巡查能让人防患于未然，避免溃堤效应。" },
];

const BRONZE_CARDS = [
  { id: "bronze_plough", name: "青铜犁整田", era: "bronze", zone: "production", requirement: { type: "min", value: 4 }, effect: [{ type: "addResource", resource: "food", amount: 2 }], bonusEffects: [{ condition: { type: "diceEquals", value: 6 }, effect: [{ type: "addResource", resource: "food", amount: 1 }] }], knowledge: "相较于木石，青铜犁更坚硬耐用，它极大提高了破土挖沟的深度与整地的效率。这是农业生产力历史性跨越的一个重要节点。" },
  { id: "bronze_spade_ditch", name: "青铜锹开沟", era: "bronze", zone: "building", requirement: { type: "min", value: 4 }, effect: [{ type: "unfreezeCards", zone: "random", count: 1 }, { type: "addResource", resource: "shelter", amount: 1 }], knowledge: "青铜锹等金属设施让开挖宽广深沟、迅速排水成为现实可能，有效减少了冰雪剧烈融化造成的次生水渍灾害和地基软化。" },
  { id: "public_granary", name: "公田粮仓", era: "bronze", zone: "building", requirement: { type: "min", value: 4 }, effect: [{ type: "protectResourceLoss", resource: "food", amount: 2 }], knowledge: "青铜时代村落规模扩大、中心化初显，公田概念与集体储粮系统逐渐形成，成为了对抗严重大跨度饥荒的社会级公共保障网络。" },
  { id: "night_watch_signal", name: "传更击柝", era: "bronze", zone: "info", requirement: { type: "min", value: 4 }, effect: [{ type: "preventPopulationLoss", amount: 1 }], bonusEffects: [{condition: {type: "diceAtLeast", value: 5}, effect: [{type: "addResource", resource: "coop", amount: 1}]}], knowledge: "借助铜质响器或更系统化的木梆进行夜间传更击柝，警戒和信号网络更为通达。它显著提高了农业聚落面对风雪暗夜险情的整体动员组织力。" }
];

const ALL_CARDS = [...MINIMAL_CARDS, ...BRONZE_CARDS];

const INITIAL_CARDS = ["stone_sickle", "gather_firewood", "pit_dwelling", "mud_wall_repair", "hearth_watch", "share_firewood", "read_clouds", "elder_warning"];

const MINIMAL_DISASTERS = [
  { id: "early_frost", name: "初霜", strength: 1, effects: [{ type: "loseResource", resource: "food", amount: 1 }], freeze: { count: 1, zone: "random" }, knowledge: "早霜会影响作物成熟与收获。" },
  { id: "cold_night", name: "夜寒", strength: 1, effects: [{ type: "loseResource", resource: "fuel", amount: 1 }], freeze: { count: 1, zone: "random" }, knowledge: "寒夜中取暖不足会直接威胁人口健康。" },
  { id: "frozen_soil", name: "冻土难耕", strength: 1, effects: [{ type: "increaseNextRequirement", zone: "production" }], freeze: { count: 1, zone: "production" }, knowledge: "冻土会降低耕作和整地效率。" },
  { id: "snow_blocks_door", name: "大雪封门", strength: 2, effects: [], freeze: { count: 1, zone: "emergency" }, knowledge: "积雪会阻碍村民行动和应急处置。" },
  { id: "snow_crushes_shed", name: "大雪压棚", strength: 2, effects: [{ type: "loseResource", resource: "shelter", amount: 1 }], freeze: { count: 1, zone: "building" }, knowledge: "暴雪会损坏棚屋、畜棚和其他附属设施。" },
  { id: "blocked_road", name: "风雪封路", strength: 2, effects: [{ type: "setTemporaryFlag", flag: "disableTradeThisTurn", value: true }], freeze: { count: 1, zone: "production" }, knowledge: "交通中断会影响物资交换和农产品流通。" },
  { id: "hunger_and_cold", name: "饥寒交迫", strength: 3, effects: [{ type: "conditional", condition: { type: "anyResourceAtZero", resources: ["food", "fuel"] }, then: [{ type: "loseResource", resource: "population", amount: 2 }] }], freeze: { count: 2, zone: "random" }, knowledge: "寒潮风险常由食物和燃料不足共同放大。" },
  { id: "long_cold", name: "连日苦寒", strength: 3, effects: [{ type: "conditional", condition: { type: "resourceAtMost", resource: "fuel", value: 0 }, then: [{ type: "loseResource", resource: "population", amount: 1 }] }], freeze: { count: 2, zone: "random" }, knowledge: "持续低温会让村落生产、建设和应急系统长期停滞。" },
];

const getCardDef = (id: string) => ALL_CARDS.find(c => c.id === id) as any;

const ZONES = [
  { id: 'production', name: '生产区', color: 'bg-green-100', borderColor: 'border-green-300' },
  { id: 'building', name: '建设区', color: 'bg-orange-100', borderColor: 'border-orange-300' },
  { id: 'emergency', name: '应急区', color: 'bg-red-100', borderColor: 'border-red-300' },
  { id: 'info', name: '信息区', color: 'bg-purple-100', borderColor: 'border-purple-300' },
];

const getEffectBadges = (effects: any[]) => {
  return effects.map((e, idx) => {
      if (e.type === 'addResource') {
          return <span key={idx} className="bg-emerald-100 text-emerald-800 px-1.5 py-0.5 rounded text-[10px] font-bold">+{e.amount} {e.resource === 'food' ? '粮食' : e.resource === 'fuel' ? '柴草' : e.resource === 'shelter' ? '房舍': e.resource}</span>
      }
      if (e.type === 'loseResource') {
          return <span key={idx} className="bg-red-100 text-red-800 px-1.5 py-0.5 rounded text-[10px] font-bold">-{e.amount} {e.resource === 'fuel' ? '柴草' : ''}</span>
      }
      if (e.type === 'preventPopulationLoss') return <span key={idx} className="bg-blue-100 text-blue-800 px-1.5 py-0.5 rounded text-[10px] font-bold">抵消 {e.amount} 人口损失</span>
      if (e.type === 'unfreezeCards') return <span key={idx} className="bg-sky-100 text-sky-800 px-1.5 py-0.5 rounded text-[10px] font-bold">解冻 {e.count} 张</span>
      if (e.type === 'protectResourceLoss') return <span key={idx} className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-[10px] font-bold">保护粮食</span>
      if (e.type === 'reduceNextRequirement') return <span key={idx} className="bg-purple-100 text-purple-800 px-1.5 py-0.5 rounded text-[10px] font-bold">下次需骰 -1</span>
      if (e.type === 'previewNextDisaster') return <span key={idx} className="bg-indigo-100 text-indigo-800 px-1.5 py-0.5 rounded text-[10px] font-bold">灾害预警</span>
      if (e.type === 'chooseProtection') return <span key={idx} className="bg-orange-100 text-orange-800 px-1.5 py-0.5 rounded text-[10px] font-bold">二选一保护</span>
      if (e.type === 'conditional') return <span key={idx} className="bg-gray-100 text-gray-800 px-1.5 py-0.5 rounded text-[10px] font-bold">条件触发</span>
      return null;
  });
};

const getDisasterThreats = (disaster: any) => {
  const threats = [];
  if (disaster.effects) {
      disaster.effects.forEach((e: any) => {
          if (e.type === 'loseResource') {
              threats.push(`必定消耗: ${e.resource === 'food' ? '粮食' : e.resource === 'fuel' ? '柴草' : e.resource === 'shelter' ? '房舍': e.resource} -${e.amount}`);
          } else if (e.type === 'conditional') {
              threats.push(`条件威胁: 若${e.condition.resources ? '粮食/柴草' : '柴草'}耗尽，则人口 -${e.then[0].amount}`);
          } else if (e.type === 'setTemporaryFlag') {
              threats.push(`环境险恶: 本轮无法贸易`);
          } else if (e.type === 'increaseNextRequirement') {
              threats.push(`环境险恶: 下轮生产点数需求 +1`);
          }
      });
  }
  if (disaster.freeze && disaster.freeze.count > 0) {
      let zName = disaster.freeze.zone === 'random' ? '随机区域' : ZONES.find(z=>z.id === disaster.freeze.zone)?.name;
      threats.push(`冰封: 将冻结 ${zName} ${disaster.freeze.count} 张`);
  }
  return threats;
}

const getBonusBadges = (def: any) => {
    let badges: any[] = [];
    if (def.bonusEffects) {
        def.bonusEffects.forEach((b:any, idx:number) => {
            let condStr = b.condition.type === 'diceAtLeast' ? `${b.condition.value}+点:` : 
                          b.condition.type === 'diceEquals' ? `${b.condition.value}点:` : '条件:';
            b.effect.forEach((e:any, eIdx:number) => {
                let badgeTxt = '';
                if (e.type === 'addResource') badgeTxt = `+${e.amount}${e.resource === 'food' ? '粮' : e.resource === 'fuel' ? '柴' : e.resource === 'shelter' ? '房': e.resource === 'coop' ? '协作' : e.resource}`;
                if (e.type === 'protectResourceLoss') badgeTxt = `保${e.resource === 'food'?'粮':e.resource==='shelter'?'房':'源'}`;
                if (e.type === 'unfreezeCards') badgeTxt = `解冻1张`;
                if (e.type === 'preventPopulationLoss') badgeTxt = `保1人`;
                if (e.type === 'chooseProtection') badgeTxt = `多防1次`;
                if (e.type === 'reduceNextRequirement') badgeTxt = `需求再-1`;
                if (badgeTxt) badges.push(<span key={`b-${idx}-${eIdx}`} className="bg-amber-100 text-amber-800 px-1 py-0.5 rounded text-[9px] font-bold border border-amber-200" title="骰点超额收益">{condStr} {badgeTxt}</span>);
            });
        });
    }
    if (def.unfreezeBonusEffects) {
        def.unfreezeBonusEffects.forEach((b:any, idx:number) => {
            let condStr = b.condition.type === 'diceInList' ? `${b.condition.values.join('/')}点解冻:` : '解冻:';
            b.effect.forEach((e:any, eIdx:number) => {
                let badgeTxt = '';
                if (e.type === 'addResource') badgeTxt = `+${e.amount}${e.resource === 'food' ? '粮' : e.resource === 'fuel' ? '柴' : e.resource === 'shelter' ? '房': e.resource === 'coop' ? '协作' : e.resource}`;
                if (badgeTxt) badges.push(<span key={`ub-${idx}-${eIdx}`} className="bg-blue-100 text-blue-800 px-1 py-0.5 rounded text-[9px] font-bold border border-blue-200" title="低点解冻补偿">{condStr} {badgeTxt}</span>);
            });
        });
    }
    return badges;
};

function checkBonusCondition(condition: any, dice: any, state: GameState, context: any) {
    if (!dice) return false;
    switch (condition.type) {
        case "diceAtLeast": return dice.value >= condition.value;
        case "diceEquals": return dice.value === condition.value;
        case "diceInList": return condition.values.includes(dice.value);
        case "cardWasFrozen": return context.cardWasFrozen === true;
        default: return false;
    }
}

// --- STATE ---

type GameState = {
  phase: string;
  turn: number;
  resources: Record<string, number>;
  dice: any[];
  cards: any[];
  deck: { disasterDeck: any[], disasterDiscard: any[] };
  currentDisaster: any | null;
  temporaryFlags: any;
  nextTurnFlags: any;
  logs: string[];
  eduLogs: string[];
  rewardChoices: any[];
  gameResult: string | null;
  selectedDiceId: string | null;
  
  resolveQueue: any[];
  resolveQueueKey: number;
  resourceDeltas: Record<string, {amount: number, id: number}>;
  coopCards: string[];
  activeResolvingType: string | null;
  activeResolvingCardId: string | null;
  freezeRandomizer: number[];
};

const initialState: GameState = {
  phase: 'loading', turn: 1,
  resources: { population: 6, food: 5, fuel: 4, shelter: 3, coop: 0 },
  dice: [], cards: [],
  deck: { disasterDeck: [], disasterDiscard: [] },
  currentDisaster: null,
  temporaryFlags: {}, nextTurnFlags: {},
  logs: [], eduLogs: [], rewardChoices: [], gameResult: null, selectedDiceId: null,
  
  resolveQueue: [], resolveQueueKey: 0, resourceDeltas: {}, coopCards: [],
  activeResolvingType: null, activeResolvingCardId: null, freezeRandomizer: [],
};

function gameReducer(state: GameState, action: any): GameState {
  const nextState: GameState = JSON.parse(JSON.stringify(state));

  const log = (msg: string) => nextState.logs.push(`[回合${nextState.turn}] ` + msg);
  const eduLog = (msg: string) => nextState.eduLogs.push(`[科普] ` + msg);

  const modifyResource = (res: string, amount: number) => {
    let finalAmount = amount;
    if (amount < 0) {
        if (res === 'population' && nextState.temporaryFlags.preventPopulationLoss > 0) {
            const prevented = Math.min(nextState.temporaryFlags.preventPopulationLoss, -amount);
            nextState.temporaryFlags.preventPopulationLoss -= prevented;
            finalAmount += prevented;
        }
        if (res === 'food' && nextState.temporaryFlags.protectFoodLoss > 0) {
            const prevented = Math.min(nextState.temporaryFlags.protectFoodLoss, -amount);
            nextState.temporaryFlags.protectFoodLoss -= prevented;
            finalAmount += prevented;
        }
        if (res === 'shelter' && nextState.temporaryFlags.protectShelterLoss > 0) {
             const prevented = Math.min(nextState.temporaryFlags.protectShelterLoss, -amount);
             nextState.temporaryFlags.protectShelterLoss -= prevented;
             finalAmount += prevented;
        }
    }
    
    if (finalAmount === 0 && amount !== 0) return;

    const current = nextState.resources[res] || 0;
    const max = MAX_RESOURCES[res];
    nextState.resources[res] = Math.max(0, Math.min(max, current + finalAmount));
    
    const actual = nextState.resources[res] - current;
    if (actual !== 0) {
        const sign = actual > 0 ? '+' : '';
        const name: Record<string, string> = { population: '人口', food: '粮食', fuel: '柴草', shelter: '房舍', coop: '协作' };
        log(`${name[res]} ${sign}${actual}`);
    }
  };

  const executeEffects = (stateObj: GameState, effects: any[]) => {
    effects.forEach(effect => {
        switch(effect.type) {
           case 'addResource': modifyResource(effect.resource, effect.amount); break;
           case 'loseResource': modifyResource(effect.resource, -effect.amount); break;
           case 'preventPopulationLoss': 
              stateObj.temporaryFlags.preventPopulationLoss = (stateObj.temporaryFlags.preventPopulationLoss || 0) + effect.amount; 
              break;
           case 'protectResourceLoss': 
              if(effect.resource === 'food') stateObj.temporaryFlags.protectFoodLoss = (stateObj.temporaryFlags.protectFoodLoss || 0) + effect.amount;
              if(effect.resource === 'shelter') stateObj.temporaryFlags.protectShelterLoss = (stateObj.temporaryFlags.protectShelterLoss || 0) + effect.amount;
              break;
           case 'unfreezeCards':
              let count = effect.count;
              stateObj.cards.filter(c => c.frozen && getCardDef(c.defId).zone === effect.zone).forEach(c => {
                 if (count > 0) {
                     c.frozen = false; count--;
                     log(`【${getCardDef(c.defId).name}】被解冻。`);
                 }
              });
              break;
           case 'previewNextDisaster':
              stateObj.temporaryFlags.previewDisaster = true;
              break;
           case 'reduceNextRequirement':
              stateObj.nextTurnFlags.reduceEmergencyReq = true; 
              break;
           case 'increaseNextRequirement':
              stateObj.nextTurnFlags.increaseProdReq = true;
              break;
           case 'chooseProtection':
              stateObj.temporaryFlags.protectFoodLoss = (stateObj.temporaryFlags.protectFoodLoss || 0) + 1;
              stateObj.temporaryFlags.protectShelterLoss = (stateObj.temporaryFlags.protectShelterLoss || 0) + 1;
              break;
           case 'conditional':
              if (effect.condition.type === 'resourceAtMost') {
                 if ((stateObj.resources[effect.condition.resource]||0) <= effect.condition.value) {
                    if (effect.then) executeEffects(stateObj, effect.then);
                 } else {
                    if (effect.else) executeEffects(stateObj, effect.else);
                 }
              } else if (effect.condition.type === 'anyResourceAtZero') {
                 if (effect.condition.resources.some((r:string) => (stateObj.resources[r]||0) <= 0)) {
                    if (effect.then) executeEffects(stateObj, effect.then);
                 }
              }
              break;
        }
    });
  };

  switch (action.type) {
    case 'INIT_AND_START':
      nextState.resources = { population: 6, food: 5, fuel: 4, shelter: 3, coop: 0 };
      nextState.cards = INITIAL_CARDS.map(id => ({
          instanceId: `card_${id}_${Math.random()}`,
          defId: id, frozen: false, exhausted: false, assignedDiceId: null
      }));
      nextState.deck.disasterDeck = action.payload.shuffledDisasters;
      nextState.deck.disasterDiscard = [];
      nextState.turn = 1;
      nextState.logs = []; nextState.eduLogs = [];
      nextState.gameResult = null;
      // Fallthrough to START_TURN logic
      
    case 'START_TURN':
      nextState.logs = []; // Clear logs visually for the new turn
      nextState.selectedDiceId = null;
      nextState.temporaryFlags = { ...nextState.nextTurnFlags };
      nextState.nextTurnFlags = {};
      nextState.cards.forEach(c => { c.assignedDiceId = null; c.exhausted = false; });
      
      if (nextState.deck.disasterDeck.length === 0) {
        // Technically minimal deck fits 6 turns, but just in case
        nextState.deck.disasterDeck = nextState.deck.disasterDiscard;
        nextState.deck.disasterDiscard = [];
      }
      nextState.currentDisaster = nextState.deck.disasterDeck.shift();
      nextState.deck.disasterDiscard.push(nextState.currentDisaster);

      log(`遭遇寒潮：${nextState.currentDisaster.name} (强度: ${nextState.currentDisaster.strength})`);
      eduLog(nextState.currentDisaster.knowledge);

      const frozenCount = nextState.cards.filter(c => c.frozen).length;
      let diceCount = frozenCount >= 3 ? 3 : 4;
      nextState.dice = action.payload.diceVals.slice(0, diceCount).map((val: number, i: number) => ({
         id: `dice_${nextState.turn}_${i}`,
         value: val,
         assignedCardId: null,
         used: false,
      }));
      if (frozenCount >= 3) log("由于冻结卡牌达到3张，本轮产出一个骰子丧失。");
      nextState.phase = 'assign_dice';
      return nextState;

    case 'SELECT_DICE':
      if (nextState.phase !== 'assign_dice') return state;
      const dice = nextState.dice.find(d => d.id === action.payload.id);
      if (dice && !dice.used && !dice.assignedCardId) {
         nextState.selectedDiceId = nextState.selectedDiceId === action.payload.id ? null : action.payload.id;
      }
      return nextState;

    case 'ASSIGN_CARD':
      if (nextState.phase !== 'assign_dice' || !nextState.selectedDiceId) return state;
      const card = nextState.cards.find(c => c.instanceId === action.payload.id);
      const selDice = nextState.dice.find(d => d.id === nextState.selectedDiceId);
      if (card && selDice && !card.assignedDiceId) {
         card.assignedDiceId = selDice.id;
         selDice.assignedCardId = card.instanceId;
         nextState.selectedDiceId = null;
      }
      return nextState;

    case 'UNASSIGN_CARD':
       const cInst = nextState.cards.find(c => c.instanceId === action.payload.id);
       if (cInst && cInst.assignedDiceId) {
           const d = nextState.dice.find(d => d.id === cInst.assignedDiceId);
           if(d) d.assignedCardId = null;
           cInst.assignedDiceId = null;
       }
       return nextState;

    case 'SPEND_FUEL_UNFREEZE':
        if (nextState.resources.fuel > 0) {
            const cUnfreeze = nextState.cards.find(c => c.instanceId === action.payload.id);
            if (cUnfreeze && cUnfreeze.frozen) {
                cUnfreeze.frozen = false;
                modifyResource('fuel', -1);
                eduLog("柴草不仅用于取暖，也代表寒潮中恢复行动能力所需的基础资源。");
            }
        }
        return nextState;

    case 'START_RESOLUTION':
      nextState.phase = 'resolving';
      nextState.resolveQueueKey = 0;
      nextState.resourceDeltas = {};
      nextState.coopCards = [];
      nextState.activeResolvingType = null;
      nextState.activeResolvingCardId = null;
      nextState.freezeRandomizer = action.payload.freezeRandomizer;

      const assignedCardsInsts = nextState.cards.filter(c => c.assignedDiceId);
      const zoneOrd = ["info", "production", "building", "emergency"];
      assignedCardsInsts.sort((a, b) => zoneOrd.indexOf(getCardDef(a.defId).zone) - zoneOrd.indexOf(getCardDef(b.defId).zone));

      nextState.resolveQueue = assignedCardsInsts.map(c => ({ type: 'card', cardId: c.instanceId }));
      nextState.resolveQueue.push({ type: 'coop' });
      nextState.resolveQueue.push({ type: 'disaster' });
      nextState.resolveQueue.push({ type: 'game_over_check', payload: action.payload });
      return nextState;

    case 'PROCESS_NEXT_QUEUE_ITEM':
      if (nextState.resolveQueue.length === 0) return nextState;
      const item = nextState.resolveQueue.shift();
      nextState.resolveQueueKey++;
      nextState.resourceDeltas = {};
      nextState.coopCards = [];
      nextState.activeResolvingType = item.type;
      nextState.activeResolvingCardId = item.type === 'card' ? item.cardId : null;

      const resBefore = { ...nextState.resources };

      if (item.type === 'card') {
          const cInst = nextState.cards.find(c => c.instanceId === item.cardId);
          if (cInst) {
              const def = getCardDef(cInst.defId);
              const assignedD = nextState.dice.find(d => d.id === cInst.assignedDiceId);
              if (assignedD) {
                  let reqValue = def.requirement.value;
                  if (def.zone === 'emergency' && nextState.temporaryFlags.reduceEmergencyReq) reqValue -= 1;
                  if (def.zone === 'production' && nextState.temporaryFlags.increaseProdReq) reqValue += 1;
                  
                  const reqMet = assignedD.value >= reqValue;

                  if (cInst.frozen) {
                      cInst.frozen = false;
                      log(`【${def.name}】被解冻。`);
                      assignedD.used = true;
                      cInst.exhausted = true;
                      if (!reqMet) {
                          log(`【${def.name}】由于点数不足，仅解除冻结。`);
                          if (def.unfreezeBonusEffects) {
                              def.unfreezeBonusEffects.forEach((bonus:any) => {
                                  if (checkBonusCondition(bonus.condition, assignedD, nextState, {cardWasFrozen: true})) {
                                      executeEffects(nextState, bonus.effect);
                                      log(`▶ 触发低点解冻补偿!`);
                                  }
                              });
                          }
                      }
                  }

                  if (reqMet) {
                      log(`发动【${def.name}】。`);
                      eduLog(def.knowledge);
                      executeEffects(nextState, def.effect);
                      
                      if (def.bonusEffects) {
                          def.bonusEffects.forEach((bonus:any) => {
                              if (checkBonusCondition(bonus.condition, assignedD, nextState, {cardWasFrozen: cInst.frozen})) {
                                  executeEffects(nextState, bonus.effect);
                                  log(`▶ 触发高点数额外收益!`);
                              }
                          });
                      }
                      
                      if (assignedD.value === 6) {
                          const frozenInZone = nextState.cards.find(c => c.frozen && getCardDef(c.defId).zone === def.zone);
                          if (frozenInZone) {
                              frozenInZone.frozen = false;
                              log(`6点高强度作业，额外解冻了【${getCardDef(frozenInZone.defId).name}】`);
                          }
                      }
                  } else if (!reqMet && !cInst.frozen) {
                      log(`【${def.name}】由于骰点不足(${assignedD.value} < ${reqValue}) 未能发动。`);
                  }
                  assignedD.used = true;
                  cInst.exhausted = true;              
              }
          }
      } 
      else if (item.type === 'coop') {
          const assignedCardsInsts2 = nextState.cards.filter(c => c.assignedDiceId);
          const usedValues = assignedCardsInsts2.map(c => nextState.dice.find(d => d.id === c.assignedDiceId)?.value).filter(Boolean);
          const valueCounts: Record<number, number> = {};
          usedValues.forEach(v => valueCounts[v!] = (valueCounts[v!] || 0) + 1);
          
          let pairs = 0;
          const pairVals: number[] = [];
          Object.entries(valueCounts).forEach(([v, count]) => {
              const p = Math.floor(count / 2);
              if (p > 0) { pairs += p; pairVals.push(Number(v)); }
          });

          if (pairs > 0) {
              modifyResource('coop', pairs);
              log(`凑出对子，获得 ${pairs} 协作值。`);
              eduLog("相同骰点触发村落协作，表现多户共同劳动带来的抗灾韧性。");
          }

          const usedZones = new Set(assignedCardsInsts2.map(c => getCardDef(c.defId).zone));
          if (usedZones.size === 4) {
              nextState.temporaryFlags.disStrMod = -1; // store for disaster step
              log("四业俱备：本轮寒潮强度 -1。");
              eduLog("农业村落的生产、建设、应急与经验判断共同运作，能降低灾害冲击。");
          }
          
          if (pairs > 0 || usedZones.size === 4) {
              const cpCards: string[] = [];
              assignedCardsInsts2.forEach(c => {
                  const d = nextState.dice.find(d => d.id === c.assignedDiceId);
                  if (d && (pairVals.includes(d.value) || usedZones.size === 4)) {
                      cpCards.push(c.instanceId);
                  }
              });
              nextState.coopCards = cpCards;
          }
      } 
      else if (item.type === 'disaster') {
          log("--- 进入寒潮结算 ---");
          let foodLoss = 1;
          let fuelLoss = 1;

          if (nextState.resources.food >= foodLoss) {
              modifyResource('food', -foodLoss);
          } else {
              const shortage = foodLoss - nextState.resources.food;
              modifyResource('food', -nextState.resources.food);
              modifyResource('population', -shortage);
              eduLog("粮食不足会让寒潮从自然风险转化为人口风险。");
          }

          if (nextState.resources.fuel >= fuelLoss) {
              modifyResource('fuel', -fuelLoss);
          } else {
              const shortage = fuelLoss - nextState.resources.fuel;
              modifyResource('fuel', -nextState.resources.fuel);
              modifyResource('population', -shortage);
              eduLog("柴草不足会削弱取暖和行动能力，严寒会直接威胁生命。");
          }

          const dis = nextState.currentDisaster;
          if (dis) {
              executeEffects(nextState, dis.effects);
              let disStrMod = nextState.temporaryFlags.disStrMod || 0;
              let freezeCount = Math.max(0, dis.strength + disStrMod);
              if (freezeCount > 0) {
                  const cand = nextState.cards.filter(c => !c.frozen && (dis.freeze.zone === 'random' || getCardDef(c.defId).zone === dis.freeze.zone));
                  cand.sort((a, b) => nextState.freezeRandomizer[nextState.cards.indexOf(a)] - nextState.freezeRandomizer[nextState.cards.indexOf(b)]);
                  cand.slice(0, freezeCount).forEach(c => {
                      c.frozen = true;
                      log(`寒潮冻结了【${getCardDef(c.defId).name}】。`);
                  });
              }
          }

          if (nextState.resources.shelter <= 0) {
              modifyResource('population', -1);
              if (nextState.resources.population > 0) eduLog("房舍损坏会提高寒潮对人口的直接威胁。");
          }
      }
      else if (item.type === 'game_over_check') {
          nextState.freezeRandomizer = [];
          nextState.activeResolvingType = null;
          
          if (nextState.resources.population <= 0) {
              nextState.phase = 'game_over';
              nextState.gameResult = 'lose';
              log("人口归零，村落未能渡过寒冬。");
          } else if (nextState.turn >= 6) {
              nextState.phase = 'game_over';
              nextState.gameResult = 'win';
              log("寒潮结束，村落保留了人口。");
          } else {
              nextState.phase = 'reward';
              nextState.rewardChoices = item.payload.rewardChoices;
          }
          return nextState; 
      }

      Object.keys(nextState.resources).forEach(k => {
          if (nextState.resources[k] !== resBefore[k]) {
              nextState.resourceDeltas[k] = { amount: nextState.resources[k] - resBefore[k], id: Date.now() + Math.random() };
          }
      });

      return nextState;

    case 'CHOOSE_REWARD':
      const rDef = getCardDef(action.payload.id);
      nextState.cards.push({
          instanceId: `card_${action.payload.id}_${Math.random()}`,
          defId: rDef.id, frozen: false, exhausted: false, assignedDiceId: null
      });
      nextState.turn++;
      return gameReducer(nextState, { type: 'START_TURN', payload: action.payload });
      
    default:
      return state;
  }
}

// --- COMPONENTS ---

export default function Game() {
  const [state, dispatch] = useReducer(gameReducer, initialState);
  const boardRef = useRef<HTMLDivElement>(null);
  const [coopLines, setCoopLines] = useState<{x1:number, y1:number, x2:number, y2:number}[]>([]);
  
  useEffect(() => {
     handleInit();
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleInit = () => {
     const diceVals = Array.from({length: 4}, () => Math.floor(Math.random() * 6) + 1);
     const shuffledDisasters = [...MINIMAL_DISASTERS].sort(() => Math.random() - 0.5);
     dispatch({ type: 'INIT_AND_START', payload: { diceVals, shuffledDisasters } });
  }

  useEffect(() => {
     if (state.phase === 'resolving') {
         const timer = setTimeout(() => {
             dispatch({ type: 'PROCESS_NEXT_QUEUE_ITEM' });
         }, 1200);
         return () => clearTimeout(timer);
     }
  }, [state.phase, state.resolveQueueKey]);

  useEffect(() => {
     if (state.coopCards.length > 1 && boardRef.current) {
         const t = setTimeout(() => {
             if (!boardRef.current) return;
             const boardRect = boardRef.current.getBoundingClientRect();
             const lines = [];
             for (let i = 0; i < state.coopCards.length - 1; i++) {
                 const el1 = document.getElementById(`card-dom-${state.coopCards[i]}`);
                 const el2 = document.getElementById(`card-dom-${state.coopCards[i+1]}`);
                 if (el1 && el2) {
                     const r1 = el1.getBoundingClientRect();
                     const r2 = el2.getBoundingClientRect();
                     lines.push({
                         x1: r1.left + r1.width/2 - boardRect.left,
                         y1: r1.top + r1.height/2 - boardRect.top,
                         x2: r2.left + r2.width/2 - boardRect.left,
                         y2: r2.top + r2.height/2 - boardRect.top,
                     });
                 }
             }
             if (state.coopCards.length >= 4) {
                  const el1 = document.getElementById(`card-dom-${state.coopCards[state.coopCards.length-1]}`);
                  const el2 = document.getElementById(`card-dom-${state.coopCards[0]}`);
                  if (el1 && el2) {
                     const r1 = el1.getBoundingClientRect();
                     const r2 = el2.getBoundingClientRect();
                     lines.push({
                         x1: r1.left + r1.width/2 - boardRect.left,
                         y1: r1.top + r1.height/2 - boardRect.top,
                         x2: r2.left + r2.width/2 - boardRect.left,
                         y2: r2.top + r2.height/2 - boardRect.top,
                     });
                 }
             }
             setCoopLines(lines);
         }, 50);
         return () => clearTimeout(t);
     } else {
         setCoopLines([]);
     }
  }, [state.coopCards]);

  const handleConfirm = () => {
      let pool: any[] = MINIMAL_CARDS;
      if (state.turn >= 3) {
          pool = ALL_CARDS;
      }
      const rewardOpts = pool.filter(d => !state.cards.find(c => c.defId === d.id));
      const rewardChoices = [...rewardOpts].sort(() => Math.random() - 0.5).slice(0, 3);
      const freezeRandomizer = Array.from({length: 20}, () => Math.random());
      dispatch({ type: 'START_RESOLUTION', payload: { rewardChoices, freezeRandomizer } });
  }

  const handleChooseReward = (id: string) => {
      const diceVals = Array.from({length: 4}, () => Math.floor(Math.random() * 6) + 1);
      dispatch({ type: 'CHOOSE_REWARD', payload: { id, diceVals } });
  }

  if (state.phase === 'loading') return <div className="h-screen flex items-center justify-center">Loading...</div>;

  const previewDisasterObj = state.temporaryFlags.previewDisaster && state.deck.disasterDeck.length > 0 
                             ? state.deck.disasterDeck[0] : null;

  let resolvingText = "";
  if (state.phase === 'resolving') {
     if (state.activeResolvingType === 'card' && state.activeResolvingCardId) {
         const cInst = state.cards.find(c => c.instanceId === state.activeResolvingCardId);
         if (cInst) resolvingText = `正在发动卡牌: ${getCardDef(cInst.defId).name}`;
     } else if (state.activeResolvingType === 'coop') {
         resolvingText = "正在结算: 村落协作";
     } else if (state.activeResolvingType === 'disaster') {
         resolvingText = "正在结算: 寒潮灾害";
     } else {
         resolvingText = "结算中...";
     }
  }

  return (
    <div className="min-h-screen bg-[#F0EBE1] text-stone-900 font-sans p-4 selection:bg-amber-200">
      <div className="max-w-6xl mx-auto flex flex-col gap-4">
         
         {/* TOP BAR */}
         <div className="flex flex-wrap items-center justify-between bg-white px-6 py-4 rounded-2xl shadow-sm border border-stone-200 sticky top-4 z-10">
            <div className="font-bold text-lg text-stone-600 bg-stone-100 px-4 py-1.5 rounded-full flex items-center gap-2">
               回合 <span className="text-stone-900">{state.turn}</span> <span className="text-stone-400">/ 6</span>
            </div>
            <div className="flex flex-wrap gap-4 md:gap-8 text-lg">
               <div className="flex flex-col items-center relative" title="人口 - 核心生命值，归零即失败">
                  <span className="flex items-center gap-1.5 text-stone-500 text-xs font-bold uppercase tracking-wider"><Users size={14}/> 人口</span>
                  <span className={cn("font-bold text-2xl transition-colors", state.resources.population <= 2 ? "text-red-500 animate-pulse drop-shadow-md" : "text-stone-800")}>{state.resources.population}</span>
                  {state.resources.population <= 2 && <span className="absolute -bottom-4 text-[10px] text-red-500 font-bold w-max">归零即失败!</span>}
                  {state.resourceDeltas.population && <div key={state.resourceDeltas.population.id} className={cn("absolute -top-6 text-xl font-black animate-float-up z-20 drop-shadow-md", state.resourceDeltas.population.amount > 0 ? "text-emerald-500" : "text-red-500")}>{state.resourceDeltas.population.amount > 0 ? '+' : ''}{state.resourceDeltas.population.amount}</div>}
               </div>
               <div className="flex flex-col items-center relative">
                  <span className="flex items-center gap-1.5 text-stone-500 text-xs font-bold uppercase tracking-wider"><Wheat size={14}/> 粮食</span>
                  <span className={cn("font-bold text-2xl", state.resources.food < 1 ? "text-red-500 animate-pulse" : "text-stone-800")}>{state.resources.food}</span>
                  <span className="absolute -bottom-4 text-[10px] text-stone-400 whitespace-nowrap">消耗: -1/轮</span>
                  {state.resourceDeltas.food && <div key={state.resourceDeltas.food.id} className={cn("absolute -top-6 text-xl font-black animate-float-up z-20 drop-shadow-md", state.resourceDeltas.food.amount > 0 ? "text-emerald-500" : "text-red-500")}>{state.resourceDeltas.food.amount > 0 ? '+' : ''}{state.resourceDeltas.food.amount}</div>}
               </div>
               <div className="flex flex-col items-center relative">
                  <span className="flex items-center gap-1.5 text-stone-500 text-xs font-bold uppercase tracking-wider"><Flame size={14}/> 柴草</span>
                  <span className={cn("font-bold text-2xl", state.resources.fuel < 1 ? "text-red-500 animate-pulse" : "text-stone-800")}>{state.resources.fuel}</span>
                  <span className="absolute -bottom-4 text-[10px] text-stone-400 whitespace-nowrap">消耗: -1/轮</span>
                  {state.resourceDeltas.fuel && <div key={state.resourceDeltas.fuel.id} className={cn("absolute -top-6 text-xl font-black animate-float-up z-20 drop-shadow-md", state.resourceDeltas.fuel.amount > 0 ? "text-emerald-500" : "text-red-500")}>{state.resourceDeltas.fuel.amount > 0 ? '+' : ''}{state.resourceDeltas.fuel.amount}</div>}
               </div>
               <div className="flex flex-col items-center relative">
                  <span className="flex items-center gap-1.5 text-stone-500 text-xs font-bold uppercase tracking-wider"><Home size={14}/> 房舍</span>
                  <span className="font-bold text-2xl text-stone-800">{state.resources.shelter}</span>
                  {state.resourceDeltas.shelter && <div key={state.resourceDeltas.shelter.id} className={cn("absolute -top-6 text-xl font-black animate-float-up z-20 drop-shadow-md", state.resourceDeltas.shelter.amount > 0 ? "text-emerald-500" : "text-red-500")}>{state.resourceDeltas.shelter.amount > 0 ? '+' : ''}{state.resourceDeltas.shelter.amount}</div>}
               </div>
               <div className="flex flex-col items-center relative">
                  <span className="flex items-center gap-1.5 text-stone-500 text-xs font-bold uppercase tracking-wider"><Handshake size={14}/> 协作</span>
                  <span className="font-bold text-2xl text-stone-800 flex items-center gap-1">
                      {state.resources.coop} 
                  </span>
                  {state.resourceDeltas.coop && <div key={state.resourceDeltas.coop.id} className={cn("absolute -top-6 text-xl font-black animate-float-up z-20 drop-shadow-md", state.resourceDeltas.coop.amount > 0 ? "text-emerald-500" : "text-red-500")}>{state.resourceDeltas.coop.amount > 0 ? '+' : ''}{state.resourceDeltas.coop.amount}</div>}
               </div>
            </div>
         </div>

         <div className="grid grid-cols-1 lg:grid-cols-12 gap-4">
            {/* LEFT COLUMN: Disaster & Dice */}
            <div className="lg:col-span-3 flex flex-col gap-4">
               {/* DISASTER PANEL */}
               <div className={cn("bg-sky-50 border border-sky-200 rounded-2xl p-5 shadow-sm relative overflow-hidden transition-all", state.activeResolvingType === 'disaster' ? "animate-flash-disaster" : "")}>
                  <div className="absolute -right-4 -top-4 opacity-10 text-sky-800">
                     <Snowflake size={120} />
                  </div>
                  <div className="relative z-10">
                      <div className="flex items-center gap-2 text-sky-700 font-bold mb-3 text-sm">
                         <ShieldAlert size={16}/> 本轮寒潮
                      </div>
                      <h3 className="font-bold text-sky-900 text-2xl mb-1">{state.currentDisaster?.name}</h3>
                      <div className="text-xs font-bold bg-sky-200 text-sky-800 inline-block px-2 py-0.5 rounded mb-3">强度 {state.currentDisaster?.strength}</div>
                      <p className="text-sm text-sky-800 leading-relaxed mb-4">{state.currentDisaster?.knowledge}</p>
                      
                      <div className="bg-white/80 rounded-xl p-3 border border-sky-100 mb-4">
                          <div className="text-xs font-bold text-sky-900 mb-2 border-b border-sky-100 pb-1">预计结算影响：</div>
                          <div className="flex flex-col gap-1.5">
                              {state.currentDisaster ? getDisasterThreats(state.currentDisaster).map((t, idx) => (
                                  <div key={idx} className="text-sm flex items-start gap-1.5">
                                      <span className="text-red-500 mt-0.5">•</span>
                                      <span className="text-stone-700 font-medium">{t}</span>
                                  </div>
                              )) : null}
                          </div>
                      </div>

                      {previewDisasterObj && (
                         <div className="mt-2 bg-white/60 p-3 rounded-lg border border-sky-200 shadow-sm backdrop-blur-sm">
                            <div className="text-xs font-bold text-stone-500 mb-1 flex items-center gap-1"><Info size={12}/> 下轮预警</div>
                            <div className="font-bold text-stone-800">{previewDisasterObj.name}</div>
                         </div>
                      )}
                  </div>
               </div>

               {/* DICE PANEL */}
               <div className="bg-white border border-stone-200 rounded-2xl p-5 shadow-sm flex-1">
                  <div className="flex items-center justify-between mb-4">
                     <div className="font-bold text-stone-700 flex items-center gap-2"><Dice1 size={18}/> 可用骰子</div>
                     <div className="text-xs text-stone-400 font-mono">分配到卡牌上发动效果</div>
                  </div>
                  <div className="flex flex-wrap gap-3">
                     {state.dice.map(d => {
                        if (d.assignedCardId) return null;
                        const isSel = state.selectedDiceId === d.id;
                        return (
                           <button 
                             key={d.id} 
                             onClick={() => dispatch({type: 'SELECT_DICE', payload: {id: d.id}})}
                             disabled={d.used}
                             className={cn(
                                "w-14 h-14 rounded-xl flex items-center justify-center text-2xl font-black transition-all shadow-sm",
                                d.used ? "bg-stone-100 text-stone-300 cursor-not-allowed opacity-50" :
                                isSel ? "bg-amber-400 ring-4 ring-amber-500 text-amber-900 scale-110 shadow-md" : "bg-stone-50 border-2 border-stone-200 text-stone-700 hover:border-amber-300 hover:bg-amber-50"
                             )}
                           >
                             {d.value}
                           </button>
                        )
                     })}
                  </div>
                  <div className="mt-6 pt-4 border-t border-stone-100 min-h-[80px] flex flex-col justify-center">
                     {state.phase === 'assign_dice' ? (
                         <button 
                            onClick={handleConfirm}
                            className="w-full py-3 bg-stone-800 hover:bg-stone-900 text-white font-bold rounded-xl transition-colors shadow-sm"
                         >
                            确认执行行动
                         </button>
                     ) : state.phase === 'resolving' ? (
                         <div className="w-full py-3 bg-amber-100 text-amber-800 font-bold rounded-xl text-center shadow-inner flex items-center justify-center gap-2">
                             <span className="w-4 h-4 border-2 border-amber-400 border-t-transparent rounded-full animate-spin"></span>
                             {resolvingText}
                         </div>
                     ) : (
                         <div className="w-full py-3 bg-stone-100 text-stone-400 font-bold rounded-xl text-center">
                             请等待...
                         </div>
                     )}
                  </div>
               </div>
            </div>

            {/* BOARD */}
            <div className="lg:col-span-9 bg-white/50 rounded-3xl p-4 border border-stone-200 shadow-sm relative" ref={boardRef}>
               {/* COOP LINES OVERLAY */}
               {coopLines.length > 0 && (
                  <svg className="absolute inset-0 w-full h-full pointer-events-none z-0">
                     {coopLines.map((line, idx) => (
                         <line key={idx} x1={line.x1} y1={line.y1} x2={line.x2} y2={line.y2} stroke="#34d399" strokeWidth="6" strokeDasharray="12,12" className="animate-dash opacity-60" strokeLinecap="round" />
                     ))}
                  </svg>
               )}
               
               <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-4 gap-4 relative z-10">
                  {ZONES.map(z => (
                     <div key={z.id} className={cn("rounded-2xl p-4 bg-white shadow-sm border", z.borderColor)}>
                        <h3 className="font-bold text-stone-700 mb-4 pb-2 border-b border-stone-100">{z.name}</h3>
                        <div className="flex flex-col gap-3">
                           {state.cards.filter(c => getCardDef(c.defId).zone === z.id).map(cInst => {
                              const def = getCardDef(cInst.defId);
                              const assignedD = state.dice.find(d => d.id === cInst.assignedDiceId);
                              const isInteractive = state.phase === 'assign_dice' && state.selectedDiceId && !assignedD && !cInst.exhausted;
                              
                              let reqValue = def.requirement.value;
                              let reqMod = 0;
                              if (def.zone === 'emergency' && state.temporaryFlags.reduceEmergencyReq) {
                                  reqValue -= 1;
                                  reqMod = -1;
                              }
                              if (def.zone === 'production' && state.temporaryFlags.increaseProdReq) {
                                  reqValue += 1;
                                  reqMod = 1;
                              }
                              let reqStr = `≥${reqValue}`;
                              
                              return (
                                 <div 
                                    key={cInst.instanceId}
                                    id={`card-dom-${cInst.instanceId}`}
                                    onClick={isInteractive ? () => dispatch({type: 'ASSIGN_CARD', payload: {id: cInst.instanceId}}) : undefined}
                                    className={cn(
                                       "relative p-3 rounded-xl border-2 bg-white flex flex-col transition-all overflow-hidden cursor-default group/card",
                                       isInteractive ? "hover:border-amber-400 hover:shadow-md cursor-pointer" : "border-stone-100 shadow-sm",
                                       cInst.exhausted ? "opacity-50 grayscale" : "",
                                       state.activeResolvingCardId === cInst.instanceId ? "animate-shake-card ring-4 ring-amber-400 border-amber-400 z-10" : "",
                                       state.coopCards.includes(cInst.instanceId) ? "ring-4 ring-emerald-400 z-10 animate-pulse bg-emerald-50" : ""
                                    )}
                                 >
                                    <div className="flex justify-between items-start mb-1">
                                       <div className="font-bold text-stone-800">{def.name}</div>
                                       <div className="flex items-center gap-1">
                                           {reqMod < 0 && <span className="text-[10px] bg-emerald-100 text-emerald-700 px-1 rounded font-bold leading-tight flex items-center h-5 whitespace-nowrap">乡老指示减免</span>}
                                           {reqMod > 0 && <span className="text-[10px] bg-red-100 text-red-700 px-1 rounded font-bold leading-tight flex items-center h-5 whitespace-nowrap">环境恶劣惩罚</span>}
                                           <div className={cn("text-xs font-mono px-1.5 py-0.5 rounded", reqMod < 0 ? "bg-emerald-200 text-emerald-900 font-bold" : reqMod > 0 ? "bg-red-200 text-red-900 font-bold" : "bg-stone-100 text-stone-600")}>
                                              {reqStr}
                                           </div>
                                       </div>
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {getEffectBadges(def.effect)}
                                    </div>
                                    <div className="flex flex-wrap gap-1 mb-2">
                                        {getBonusBadges(def)}
                                    </div>
                                    <div className="text-xs text-stone-500 mb-2 leading-tight flex-1">{def.knowledge}</div>
                                    
                                    {/* Dice Socket */}
                                    <div className={cn("w-full h-8 border-2 border-dashed rounded-lg flex items-center justify-center text-xs font-bold mt-auto transition-colors duration-200", isInteractive ? "border-amber-400 bg-amber-50 text-amber-700" : "border-stone-200 text-stone-300")}>
                                       {assignedD ? "" : isInteractive ? "▶ 点击发动" : "放置骰子"}
                                    </div>

                                    {/* Assigned Dice Overlay */}
                                    {assignedD && (() => {
                                        let reqValue = def.requirement.value;
                                        if (def.zone === 'emergency' && state.temporaryFlags.reduceEmergencyReq) reqValue -= 1;
                                        if (def.zone === 'production' && state.temporaryFlags.increaseProdReq) reqValue += 1;
                                        const isAssignedMet = assignedD.value >= reqValue;

                                        return (
                                           <div className="absolute inset-0 bg-amber-50/90 flex flex-col items-center justify-center p-3 cursor-pointer group/dice" onClick={(e) => { e.stopPropagation(); dispatch({type: 'UNASSIGN_CARD', payload: {id: cInst.instanceId}})}}>
                                              <div className="w-12 h-12 bg-amber-400 border-2 border-white shadow-md rounded-xl text-amber-900 font-bold text-xl flex items-center justify-center scale-110 mb-2 group-hover/dice:scale-100 transition-transform">
                                                  {assignedD.value}
                                              </div>
                                              {!isAssignedMet ? (
                                                  <span className="text-[10px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded shadow whitespace-nowrap">{cInst.frozen ? "点数不足 仅解冻" : "点数不足"}</span>
                                              ) : (
                                                  <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shadow flex flex-col gap-0.5 items-center opacity-90 whitespace-nowrap">
                                                      <span>{cInst.frozen ? "解冻并发动" : def.effect.map((e:any) => e.type==='addResource' ? `+${e.amount}${e.resource==='food'?'粮':e.resource==='fuel'?'柴':'房'}` : '触发').join(' ')}</span>
                                                      {def.bonusEffects && def.bonusEffects.some((b:any)=>checkBonusCondition(b.condition, assignedD, state, {cardWasFrozen: cInst.frozen})) && (
                                                          <span className="text-[9px] text-amber-600 bg-amber-100 px-1 rounded-sm w-full text-center">触发额外收益</span>
                                                      )}
                                                      {cInst.frozen && def.unfreezeBonusEffects && def.unfreezeBonusEffects.some((b:any)=>checkBonusCondition(b.condition, assignedD, state, {cardWasFrozen: true})) && (
                                                          <span className="text-[9px] text-blue-600 bg-blue-100 px-1 rounded-sm w-full text-center">触发补偿</span>
                                                      )}
                                                  </span>
                                              )}
                                           </div>
                                        );
                                     })()}

                                    {/* Preview Overlay */}
                                    {isInteractive && (() => {
                                        const selD = state.dice.find(d=>d.id===state.selectedDiceId);
                                        if (!selD) return null;
                                        let reqValue = def.requirement.value;
                                        if (def.zone === 'emergency' && state.temporaryFlags.reduceEmergencyReq) reqValue -= 1;
                                        if (def.zone === 'production' && state.temporaryFlags.increaseProdReq) reqValue += 1;
                                        const isPreviewMet = selD.value >= reqValue;

                                        return (
                                            <div className="absolute inset-0 bg-amber-50/0 group-hover/card:bg-amber-50/90 flex flex-col items-center justify-center p-3 transition-colors opacity-0 group-hover/card:opacity-100 z-10 pointer-events-none">
                                               <div className="w-12 h-12 bg-amber-200 border-2 border-white shadow-md rounded-xl text-amber-800/50 font-bold text-xl flex items-center justify-center scale-110 mb-2">
                                                  {selD.value}
                                               </div>
                                               {!isPreviewMet ? (
                                                   <span className="text-[10px] font-black bg-red-100 text-red-600 px-1.5 py-0.5 rounded shadow whitespace-nowrap">{cInst.frozen ? "点数不足 仅解冻" : "点数不足"}</span>
                                               ) : (
                                                   <span className="text-[10px] font-black bg-emerald-100 text-emerald-700 px-1.5 py-0.5 rounded shadow flex flex-col gap-0.5 items-center whitespace-nowrap">
                                                       <span>{cInst.frozen ? "解冻并发动" : def.effect.map((e:any) => e.type==='addResource' ? `+${e.amount}${e.resource==='food'?'粮':e.resource==='fuel'?'柴':'房'}` : '触发').join(' ')}</span>
                                                       {def.bonusEffects && def.bonusEffects.some((b:any)=>checkBonusCondition(b.condition, selD, state, {cardWasFrozen: cInst.frozen})) && (
                                                          <span className="text-[9px] text-amber-600 bg-amber-100 px-1 rounded-sm w-full text-center">可触发额外收益</span>
                                                      )}
                                                      {cInst.frozen && def.unfreezeBonusEffects && def.unfreezeBonusEffects.some((b:any)=>checkBonusCondition(b.condition, selD, state, {cardWasFrozen: true})) && (
                                                          <span className="text-[9px] text-blue-600 bg-blue-100 px-1 rounded-sm w-full text-center">可触发解冻补偿</span>
                                                      )}
                                                   </span>
                                               )}
                                            </div>
                                        );
                                    })()}

                                    {/* Frozen Overlay */}
                                    {cInst.frozen && (
                                       <div className="absolute inset-0 bg-sky-200/90 backdrop-blur-[2px] flex flex-col items-center justify-center cursor-pointer p-4 z-10" onClick={isInteractive ? () => dispatch({type: 'ASSIGN_CARD', payload: {id: cInst.instanceId}}) : undefined}>
                                          <div className="text-sky-900 font-black text-lg tracking-widest mb-2 flex items-center gap-1"><Snowflake size={20}/> 冻结</div>
                                          {!assignedD && (
                                              <button 
                                                onClick={(e) => { e.stopPropagation(); dispatch({type: 'SPEND_FUEL_UNFREEZE', payload: {id: cInst.instanceId}}); }}
                                                className="w-full py-1.5 bg-orange-100 text-orange-900 text-xs font-bold rounded-md hover:bg-orange-200 transition-colors flex justify-center items-center gap-1"
                                                disabled={state.resources.fuel <= 0}
                                              >
                                                  <Flame size={12}/> 柴草解冻
                                              </button>
                                          )}
                                       </div>
                                    )}
                                 </div>
                              )
                           })}
                        </div>
                     </div>
                  ))}
               </div>
            </div>
         </div>

         {/* LOGS PANEL */}
         <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="bg-stone-900 text-stone-300 p-5 rounded-2xl h-64 overflow-y-auto shadow-inner text-sm font-mono border border-stone-800 flex flex-col-reverse">
               <div>
                  {state.logs.map((L, i) => <div key={i} className="mb-1 py-1 border-b border-white/5 last:border-0">{L}</div>)}
               </div>
            </div>
            <div className="bg-emerald-50 text-emerald-900 p-5 rounded-2xl h-64 overflow-y-auto shadow-inner border border-emerald-100 flex flex-col-reverse">
               <div>
                  <h4 className="font-black text-emerald-800 mb-3 uppercase tracking-wider text-xs sticky top-0 bg-emerald-50 py-1">本轮科普摘要</h4>
                  {state.eduLogs.map((L, i) => <div key={i} className="mb-3 leading-relaxed text-sm bg-white/60 p-2 rounded-lg">&bull; {L}</div>)}
               </div>
            </div>
         </div>
      </div>

      {/* MODALS */}
      {state.phase === 'game_over' && (
         <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4">
            <div className="bg-white p-8 rounded-3xl max-w-md w-full text-center shadow-2xl">
               <h2 className={cn("text-4xl font-black mb-4", state.gameResult === 'win' ? "text-amber-500" : "text-sky-600")}>
                  {state.gameResult === 'win' ? '🎉 渡过寒冬' : '❄️ 村落覆灭'}
               </h2>
               <p className="mb-8 text-stone-600 leading-relaxed font-medium">
                  {state.gameResult === 'win' 
                     ? '你们成功依靠村落的经验、储备与协作互助，在连续寒潮中生存了下来，农业文明的火种得以延续！' 
                     : '人口归零，很遗憾，脆弱的早期防灾机制未能抵御自然伟力。'}
               </p>
               <button 
                  onClick={() => window.location.reload()} 
                  className="w-full py-4 bg-stone-900 text-white font-bold rounded-xl hover:bg-stone-800 transition-transform active:scale-95 shadow-lg"
               >
                  重新开始记录
               </button>
            </div>
         </div>
      )}

      {state.phase === 'reward' && (
         <div className="fixed inset-0 bg-stone-900/80 backdrop-blur-md flex items-center justify-center z-50 p-4 text-center">
            <div className="bg-[#F0EBE1] p-8 rounded-3xl max-w-4xl w-full shadow-2xl">
               <h2 className="text-2xl font-black text-stone-800 mb-2">回合交替</h2>
               <p className="text-stone-500 mb-8 font-medium">请选择一张新卡牌加入村落，代表文明经验的积累</p>
               <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                   {state.rewardChoices.map(def => (
                       <div 
                         key={def.id} 
                         onClick={() => handleChooseReward(def.id)}
                         className="bg-white border border-stone-200 p-6 rounded-2xl cursor-pointer hover:ring-4 ring-amber-400 hover:border-amber-400 shadow-sm transition-all text-left flex flex-col group"
                       >
                          <div className="font-black text-xl text-stone-800 mb-2 group-hover:text-amber-600 transition-colors">{def.name}</div>
                          <div className="flex gap-2 mb-4">
                             <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded">{def.zone}</span>
                             <span className="text-xs font-bold text-stone-500 bg-stone-100 px-2 py-1 rounded">需求 ≥{def.requirement.value}</span>
                          </div>
                          <div className="text-sm text-stone-600 leading-relaxed font-medium">{def.knowledge}</div>
                       </div>
                   ))}
               </div>
            </div>
         </div>
      )}
    </div>
  );
}
