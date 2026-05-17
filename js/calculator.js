/** @typedef {'in' | 'cm'} HeightUnit */
/** @typedef {'lbs' | 'kg'} WeightUnit */
/** @typedef {'1/2' | '3/4' | '1'} PvcNominalInches */
/** @typedef {'small' | 'medium' | 'large' | ''} GripSize */

export const CM_PER_INCH = 2.54;
export const KG_TO_LB = 2.204623;

/** Height (inches) at which preview distance stops increasing in the linear segment. */
export const PREVIEW_DISTANCE_MAX_HEIGHT_IN = 72;
/** Preview distance (inches) at `PREVIEW_DISTANCE_MAX_HEIGHT_IN`. */
export const PREVIEW_DISTANCE_AT_MAX_IN = 18;
/** Heights at or below this (inches) use the baseline preview distance. */
export const PREVIEW_DISTANCE_BASELINE_HEIGHT_IN = 48;
/** Preview distance (inches) for users at or below baseline height. */
export const PREVIEW_DISTANCE_AT_BASELINE_IN = 14;

/**
 * Above this hypotenuse length (inches), recommend 1" nominal Schedule 40 for users ≥100 lbs.
 * Below or equal, 3/4" is recommended.
 */
export const PVC_ONE_INCH_THRESHOLD_IN = 42;

/**
 * Mid-weight band: above this hypotenuse (inches), upgrade from 1/2" to 3/4".
 */
export const PVC_THREE_QUARTER_THRESHOLD_IN = 36;

/**
 * @param {{ totalHeight: number; heightUnit: HeightUnit; weight: number; weightUnit: WeightUnit }} input
 * @returns {{ heightIn: number; weightLb: number }}
 */
export function normalizeUnits(input) {
  const h = Number(input.totalHeight);
  const w = Number(input.weight);
  const heightIn = input.heightUnit === "cm" ? h / CM_PER_INCH : h;
  const weightLb = input.weightUnit === "kg" ? w * KG_TO_LB : w;
  return { heightIn, weightLb };
}

/**
 * @param {number} totalHeightIn
 * @returns {number}
 */
export function previewDistanceInches(totalHeightIn) {
  if (totalHeightIn <= PREVIEW_DISTANCE_BASELINE_HEIGHT_IN) {
    return PREVIEW_DISTANCE_AT_BASELINE_IN;
  }
  const span =
    PREVIEW_DISTANCE_MAX_HEIGHT_IN - PREVIEW_DISTANCE_BASELINE_HEIGHT_IN;
  const t = (totalHeightIn - PREVIEW_DISTANCE_BASELINE_HEIGHT_IN) / span;
  const linear =
    PREVIEW_DISTANCE_AT_BASELINE_IN +
    t * (PREVIEW_DISTANCE_AT_MAX_IN - PREVIEW_DISTANCE_AT_BASELINE_IN);
  return Math.min(
    PREVIEW_DISTANCE_AT_MAX_IN,
    Math.max(PREVIEW_DISTANCE_AT_BASELINE_IN, linear),
  );
}

/**
 * @param {number} heightIn Total user height in inches (normalized).
 * @returns {{ handleHeightIn: number; previewDistIn: number; partA: number; partB: number; partC: number; partD: number; partE: number; partF: number; partG: number; partH: number; partI: number; partJ: number; partK: number; }}
 */
export function computeDimensions(heightIn) {
  const handleHeightIn = heightIn * 0.6;
  const previewDistIn = previewDistanceInches(heightIn);
  const shaftLengthIn = Math.hypot(handleHeightIn, previewDistIn);
  return {
    handleHeightIn,
    previewDistIn,
    partA: 12.0,
    partB: shaftLengthIn,
    partC: shaftLengthIn,
    partD: 6.0,
    partE: 6.0,
    partF: 6.0,
    partG: 6.0,
    partH: 12.0,
    partI: 12.0,
    partJ: 10.0,
    partK: 10.0,
  };
}

/**
 * @param {number} weightLb
 * @param {number} shaftCIn Hypotenuse in inches.
 * @returns {{ nominalInches: PvcNominalInches; reasons: string[] }}
 */
export function selectPvcNominalDiameter(weightLb, shaftCIn) {
  /** @type {string[]} */
  const reasons = [];

  if (weightLb < 50) {
    reasons.push("Weight under 50 lb: 1/2 inch nominal Schedule 40.");
    return { nominalInches: "1/2", reasons };
  }

  if (weightLb < 100) {
    if (shaftCIn > PVC_THREE_QUARTER_THRESHOLD_IN) {
      reasons.push(
        `Hypotenuse ${shaftCIn.toFixed(2)} in exceeds ${PVC_THREE_QUARTER_THRESHOLD_IN} in: upgrade to 3/4 inch to reduce bowing.`,
      );
      return { nominalInches: "3/4", reasons };
    }
    reasons.push(
      `Weight 50–99 lb and hypotenuse ≤ ${PVC_THREE_QUARTER_THRESHOLD_IN} in: 1/2 inch nominal is acceptable.`,
    );
    return { nominalInches: "1/2", reasons };
  }

  if (shaftCIn > PVC_ONE_INCH_THRESHOLD_IN) {
    reasons.push(
      `Weight ≥100 lb and hypotenuse ${shaftCIn.toFixed(2)} in exceeds ${PVC_ONE_INCH_THRESHOLD_IN} in: recommend 1 inch nominal Schedule 40.`,
    );
    return { nominalInches: "1", reasons };
  }
  reasons.push(
    `Weight ≥100 lb and hypotenuse ≤ ${PVC_ONE_INCH_THRESHOLD_IN} in: recommend 3/4 inch nominal Schedule 40.`,
  );
  return { nominalInches: "3/4", reasons };
}

function getRollerSize(mainSize) {
  if (mainSize === "1/2") return "3/4";
  if (mainSize === "3/4") return "1";
  if (mainSize === "1") return "1-1/4";
  return "1-1/2";
}

/**
 * @param {{
 *   totalHeight: number;
 *   heightUnit: HeightUnit;
 *   weight: number;
 *   weightUnit: WeightUnit;
 *   gripSize?: GripSize;
 * }} input
 */
export function calculatePreCane(input) {
  const { heightIn, weightLb } = normalizeUnits(input);
  const dimensions = computeDimensions(heightIn);
  const pvc = selectPvcNominalDiameter(weightLb, dimensions.partB);
  return {
    heightIn,
    weightLb,
    handleHeightIn: dimensions.handleHeightIn,
    previewDistIn: dimensions.previewDistIn,
    partA: dimensions.partA,
    partB: dimensions.partB,
    partC: dimensions.partC,
    partD: dimensions.partD,
    partE: dimensions.partE,
    partF: dimensions.partF,
    partG: dimensions.partG,
    partH: dimensions.partH,
    partI: dimensions.partI,
    partJ: dimensions.partJ,
    partK: dimensions.partK,
    pvcNominalInches: pvc.nominalInches,
    rollerPvcInches: getRollerSize(pvc.nominalInches),
    pvcReasons: pvc.reasons,
    gripSize: input.gripSize ?? "",
  };
}
