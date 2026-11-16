<template>
  <el-dialog
    :model-value="modelValue"
    :title="$t('filmCreate.videoParamsDialogTitle', { num: target?.storyboard_number ?? '' })"
    width="860px"
    destroy-on-close
    @update:model-value="$emit('update:modelValue', $event)"
    @close="$emit('close')"
  >
    <el-form v-if="target" label-width="115px" size="small" class="vp-dialog-form">
      <el-form-item :label="$t('filmCreate.creationMode')">
        <el-radio-group
          :model-value="params.sbCreationMode[target.id] === 'universal' ? 'universal' : 'classic'"
          size="small"
          @change="(v) => params.setSbCreationModeId(target.id, v)"
        >
          <el-radio-button value="classic">{{ $t('filmCreate.classicMode') }}</el-radio-button>
          <el-radio-button value="universal">{{ $t('filmCreate.universalMode') }}</el-radio-button>
        </el-radio-group>
        <div class="vp-mode-hint">{{ $t('filmCreate.vpModeHint') }}</div>
      </el-form-item>
      <el-row :gutter="12">
        <el-col :span="8">
          <el-form-item :label="$t('filmCreate.titleLabel')">
            <el-input v-model="params.sbTitle[target.id]" :placeholder="$t('filmCreate.shotTitlePlaceholder')" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item :label="$t('filmCreate.locationLabel')">
            <el-input v-model="params.sbLocation[target.id]" :placeholder="$t('filmCreate.sceneLocationPlaceholder')" />
          </el-form-item>
        </el-col>
        <el-col :span="5">
          <el-form-item :label="$t('filmCreate.timeLabel')">
            <el-input v-model="params.sbTime[target.id]" :placeholder="$t('filmCreate.timeOfDayPlaceholder')" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item :label="$t('filmCreate.seedLabel')">
            <el-input-number
              v-model="params.sbSeed[target.id]"
              :placeholder="$t('filmCreate.seedPlaceholder')"
              :min="0"
              :max="2147483647"
              :controls="false"
              class="vp-fullwidth"
            />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="6">
          <el-form-item :label="$t('filmCreate.durationSecondsLabel')">
            <el-input-number v-model="params.sbDuration[target.id]" :min="1" :max="60" class="vp-fullwidth" />
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item :label="$t('filmCreate.shotTypeLabel')">
            <el-select v-model="params.sbShotType[target.id]" :placeholder="$t('filmCreate.shotTypeLabel')" class="vp-fullwidth">
              <el-option :label="$t('filmCreate.shotExtremeWide')" value="大远景" /><!-- i18n-scan-ignore: DB enum value -->
              <el-option :label="$t('filmCreate.shotWide')" value="远景" /><!-- i18n-scan-ignore: DB enum value -->
              <el-option :label="$t('filmCreate.shotMedium')" value="中景" /><!-- i18n-scan-ignore: DB enum value -->
              <el-option :label="$t('filmCreate.shotClose')" value="近景" /><!-- i18n-scan-ignore: DB enum value -->
              <el-option :label="$t('filmCreate.shotCloseUp')" value="特写" /><!-- i18n-scan-ignore: DB enum value -->
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item :label="$t('filmCreate.movementLabel')">
            <el-select v-model="params.sbMovement[target.id]" :placeholder="$t('filmCreate.movementPlaceholder')" class="vp-fullwidth" clearable filterable>
              <el-option-group :label="$t('filmCreate.movementGroupBasic')">
                <el-option :label="$t('filmCreate.movementStatic')" value="static" />
                <el-option :label="$t('filmCreate.movementPush')" value="push" />
                <el-option :label="$t('filmCreate.movementPull')" value="pull" />
                <el-option :label="$t('filmCreate.movementPan')" value="pan" />
                <el-option :label="$t('filmCreate.movementTilt')" value="tilt" />
                <el-option :label="$t('filmCreate.movementTracking')" value="tracking" />
                <el-option :label="$t('filmCreate.movementCraneUp')" value="crane_up" />
                <el-option :label="$t('filmCreate.movementCraneDn')" value="crane_dn" />
                <el-option :label="$t('filmCreate.movementOrbit')" value="orbit" />
                <el-option :label="$t('filmCreate.movementHandheld')" value="handheld" />
              </el-option-group>
              <el-option-group :label="$t('filmCreate.movementGroupAdvanced')">
                <el-option :label="$t('filmCreate.movementZoom')" value="zoom" />
                <el-option :label="$t('filmCreate.movementRoll')" value="roll" />
                <el-option :label="$t('filmCreate.movementWhipPan')" value="whip_pan" />
                <el-option :label="$t('filmCreate.movementSpiral')" value="spiral" />
              </el-option-group>
              <el-option-group :label="$t('filmCreate.movementGroupCinematic')">
                <el-option :label="$t('filmCreate.movementHitchcockZoom')" value="hitchcock_zoom" />
                <el-option :label="$t('filmCreate.movementBulletTime')" value="bullet_time" />
                <el-option :label="$t('filmCreate.movementDutchAngleMove')" value="dutch_angle_move" />
                <el-option :label="$t('filmCreate.movementDollyTrack')" value="dolly_track" />
                <el-option :label="$t('filmCreate.movementSlowmoOrbit')" value="slowmo_orbit" />
              </el-option-group>
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="6">
          <el-form-item :label="$t('filmCreate.atmosphereLabel')">
            <el-input v-model="params.sbAtmosphere[target.id]" :placeholder="$t('filmCreate.atmospherePlaceholder')" />
          </el-form-item>
        </el-col>
      </el-row>
      <el-row :gutter="12">
        <el-col :span="8">
          <el-form-item :label="$t('filmCreate.cameraAngleLabel')">
            <div class="video-angle-row">
              <el-select v-model="params.sbAngleS[target.id]" :placeholder="$t('filmCreate.shotTypeLabel')" class="video-angle-select video-angle-select--shot">
                <el-option :label="$t('filmCreate.shotCloseUp')" value="close_up" />
                <el-option :label="$t('filmCreate.shotMedium')" value="medium" />
                <el-option :label="$t('filmCreate.shotWide')" value="wide" />
              </el-select>
              <el-select v-model="params.sbAngleV[target.id]" :placeholder="$t('filmCreate.anglePitch')" class="video-angle-select video-angle-select--pitch">
                <el-option :label="$t('filmCreate.angleEyeLevel')" value="eye_level" />
                <el-option :label="$t('filmCreate.angleLow')" value="low" />
                <el-option :label="$t('filmCreate.angleHigh')" value="high" />
                <el-option :label="$t('filmCreate.angleWorm')" value="worm" />
              </el-select>
              <el-select v-model="params.sbAngleH[target.id]" :placeholder="$t('filmCreate.angleDirection')" class="video-angle-select video-angle-select--direction">
                <el-option :label="$t('filmCreate.angleFront')" value="front" />
                <el-option :label="$t('filmCreate.angleFrontLeft')" value="front_left" />
                <el-option :label="$t('filmCreate.angleLeft')" value="left" />
                <el-option :label="$t('filmCreate.angleBackLeft')" value="back_left" />
                <el-option :label="$t('filmCreate.angleBack')" value="back" />
                <el-option :label="$t('filmCreate.angleBackRight')" value="back_right" />
                <el-option :label="$t('filmCreate.angleRight')" value="right" />
                <el-option :label="$t('filmCreate.angleFrontRight')" value="front_right" />
              </el-select>
              <span
                v-if="params.sbAngleS[target.id] && params.sbAngleV[target.id] && params.sbAngleH[target.id]"
                class="vp-angle-badge"
              >
                {{ params.angleToPromptFragment(params.sbAngleH[target.id], params.sbAngleV[target.id], params.sbAngleS[target.id]).label }}
              </span>
            </div>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="$t('filmCreate.lightingLabel')">
            <el-select v-model="params.sbLighting[target.id]" :placeholder="$t('filmCreate.lightingPlaceholder')" class="vp-fullwidth" clearable>
              <el-option :label="$t('filmCreate.lightNatural')" value="natural" />
              <el-option :label="$t('filmCreate.lightFront')" value="front" />
              <el-option :label="$t('filmCreate.lightSide')" value="side" />
              <el-option :label="$t('filmCreate.lightBacklit')" value="backlit" />
              <el-option :label="$t('filmCreate.lightTop')" value="top" />
              <el-option :label="$t('filmCreate.lightUnder')" value="under" />
              <el-option :label="$t('filmCreate.lightSoft')" value="soft" />
              <el-option :label="$t('filmCreate.lightDramatic')" value="dramatic" />
              <el-option :label="$t('filmCreate.lightGoldenHour')" value="golden_hour" />
              <el-option :label="$t('filmCreate.lightBlueHour')" value="blue_hour" />
              <el-option :label="$t('filmCreate.lightNight')" value="night" />
              <el-option :label="$t('filmCreate.lightNeon')" value="neon" />
            </el-select>
          </el-form-item>
        </el-col>
        <el-col :span="8">
          <el-form-item :label="$t('filmCreate.dofLabel')">
            <el-select v-model="params.sbDof[target.id]" :placeholder="$t('filmCreate.dofPlaceholder')" class="vp-fullwidth" clearable>
              <el-option :label="$t('filmCreate.dofExtremeShallow')" value="extreme_shallow" />
              <el-option :label="$t('filmCreate.dofShallow')" value="shallow" />
              <el-option :label="$t('filmCreate.dofMedium')" value="medium" />
              <el-option :label="$t('filmCreate.dofDeep')" value="deep" />
            </el-select>
          </el-form-item>
        </el-col>
      </el-row>

      <el-form-item :label="$t('filmCreate.spatialLayoutAnchorLabel')">
        <div class="vp-layout-row">
          <el-input
            v-model="params.sbLayoutDescription[target.id]"
            type="textarea"
            :rows="3"
            :placeholder="$t('filmCreate.spatialLayoutAnchorPlaceholder')"
            class="vp-layout-input"
          />
          <el-button
            size="small"
            :loading="regeneratingLayoutSbIds.has(target.id)"
            class="vp-regen-btn"
            @click="$emit('regen-layout', target)"
          >
            {{ $t('filmCreate.aiRegenOrOptimize') }}
          </el-button>
        </div>
        <div class="vp-layout-note">
          {{ $t('filmCreate.spatialLayoutAnchorNote') }}
        </div>
      </el-form-item>

      <el-form-item :label="$t('filmCreate.actionLabel')">
        <el-input v-model="params.sbAction[target.id]" type="textarea" :rows="2" :placeholder="$t('filmCreate.actionDescPlaceholder')" />
      </el-form-item>
      <el-form-item :label="$t('filmCreate.dialogueLabel')">
        <el-input v-model="params.sbDialogue[target.id]" type="textarea" :rows="2" :placeholder="$t('filmCreate.dialoguePlaceholder')" />
      </el-form-item>
      <el-form-item :label="$t('filmCreate.narrationLabel')">
        <el-input v-model="params.sbNarration[target.id]" type="textarea" :rows="2" class="sb-narration-input" :placeholder="$t('filmCreate.narrationFieldPlaceholder')" />
      </el-form-item>
      <el-form-item v-if="params.canSplitSbByAudio(target)" :label="$t('filmCreate.multiRoleDialogue')">
        <div class="sb-split-audio-row">
          <p class="sb-split-audio-tip">
            {{ $t('filmCreate.multiRoleDialogueHint') }}
          </p>
          <el-button
            type="warning"
            plain
            :loading="splitByAudioLoading"
            @click="$emit('split-audio', target)"
          >
            {{ $t('filmCreate.splitShotByDialogue') }}
          </el-button>
        </div>
      </el-form-item>
      <el-form-item :label="$t('filmCreate.resultLabel')">
        <el-input v-model="params.sbResult[target.id]" type="textarea" :rows="2" :placeholder="$t('filmCreate.resultPlaceholder')" />
      </el-form-item>
      <el-form-item :label="$t('filmCreate.videoPrompt')">
        <div class="vp-video-prompt-hint">{{ $t('filmCreate.videoPromptAutoGenerateHint') }}</div>
        <el-input
          v-if="target?.video_prompt"
          :model-value="target.video_prompt"
          type="textarea"
          :rows="3"
          readonly
          class="vp-video-prompt-display"
        />
      </el-form-item>
    </el-form>
    <template #footer>
      <el-button @click="$emit('update:modelValue', false)">{{ $t('common.cancel') }}</el-button>
      <el-button type="primary" :loading="saving" @click="$emit('save')">{{ $t('filmCreate.saveAndUpdate') }}</el-button>
    </template>
  </el-dialog>
</template>

<script setup>
defineProps({
  modelValue: {
    type: Boolean,
    default: false,
  },
  target: {
    type: Object,
    default: null,
  },
  params: {
    type: Object,
    required: true,
  },
  saving: {
    type: Boolean,
    default: false,
  },
  regeneratingLayoutSbIds: {
    type: Set,
    default: () => new Set(),
  },
  splitByAudioLoading: {
    type: Boolean,
    default: false,
  },
})

defineEmits(['update:modelValue', 'close', 'save', 'regen-layout', 'split-audio'])
</script>

<style scoped>
.vp-dialog-form .el-form-item {
  margin-bottom: 12px;
}
.vp-fullwidth {
  width: 100%;
}
.video-angle-select--pitch {
  min-width: 96px;
  flex: 1 1 96px;
}
.video-angle-row {
  display: flex;
  gap: 4px;
  flex-wrap: wrap;
}
.video-angle-select--shot {
  min-width: 96px;
  flex: 1 1 96px;
}
.video-angle-select--direction {
  min-width: 104px;
  flex: 1 1 104px;
}
.vp-angle-badge {
  font-size: 11px;
  color: var(--text-muted);
  background: var(--surface-2, rgba(255, 255, 255, 0.06));
  padding: 2px 6px;
  border-radius: 4px;
  white-space: nowrap;
}
.vp-layout-row {
  display: flex;
  gap: 8px;
  align-items: flex-start;
  width: 100%;
}
.vp-layout-input {
  flex: 1;
}
.vp-regen-btn {
  margin-top: 4px;
  white-space: nowrap;
}
.vp-layout-note {
  font-size: 11px;
  color: var(--text-muted);
  margin-top: 4px;
  line-height: 1.35;
}
.vp-video-prompt-display {
  color: var(--text-muted);
  margin-top: 8px;
}
.vp-mode-hint {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.45;
  margin-top: 8px;
  max-width: 520px;
}
.vp-video-prompt-hint {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.5;
}
.sb-split-audio-tip {
  font-size: 12px;
  color: var(--text-muted);
  line-height: 1.45;
  margin: 0 0 8px;
}
.sb-split-audio-row {
  display: flex;
  flex-direction: column;
  align-items: flex-start;
}
</style>
