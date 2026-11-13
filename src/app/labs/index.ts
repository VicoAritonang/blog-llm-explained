import type { ComponentType } from "react";
import type { LabId } from "../../content/paths";
import {
  DiceLab,
  FinalLab,
  FocusLab,
  NextWordLab,
  RulesLab,
  TrainingLab,
  VerifyLab,
} from "./BeginnerLabs";
import { BpeLab } from "./EngineerLabs";
import {
  ComputeLab,
  IclLab,
  KvLab,
  LineageLab,
  ParamsLab,
  SparseLab,
} from "./ResearchLabs";

export type LabProps = {
  complete: (taskId: string) => void;
  isDone: (taskId: string) => boolean;
  card: string;
  onCard: (card: string) => void;
};

export const labs: Record<LabId, ComponentType<LabProps>> = {
  rules: RulesLab,
  nextword: NextWordLab,
  training: TrainingLab,
  focus: FocusLab,
  dice: DiceLab,
  verify: VerifyLab,
  final: FinalLab,
  bpe: BpeLab,
  params: ParamsLab,
  compute: ComputeLab,
  sparse: SparseLab,
  kv: KvLab,
  icl: IclLab,
  lineage: LineageLab,
};
