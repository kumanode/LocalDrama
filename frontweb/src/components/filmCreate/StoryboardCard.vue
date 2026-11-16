<template>
  <div class="sb-card-wrapper">
    <!-- 分镜控制栏（卡片外，缩进表示属于当前幕） -->
    <div class="sb-ctrl-bar" :class="{ 'sb-ctrl-bar--compact': compact }">
      <el-checkbox
        :model-value="selected"
        :aria-label="$t('filmCreate.selectShot', { num: index + 1 })"
        @update:model-value="$emit('toggle-selected')"
      />
      <span v-if="!compact" class="sb-ctrl-num">{{ index + 1 }}</span>
      <span v-if="!compact" class="sb-ctrl-title">{{ sb.title || $t('filmCreate.unnamedStoryboard') }}</span>
      <el-tooltip v-if="storyboardStatus.error" :content="storyboardStatus.error" placement="top">
        <el-tag size="small" type="danger" tabindex="0">{{ $t('filmCreate.failedStatus') }}</el-tag>
      </el-tooltip>
      <el-tag v-else size="small" :type="storyboardStatus.status === 'done' ? 'success' : storyboardStatus.status === 'running' ? 'warning' : 'info'">
        <el-icon v-if="storyboardStatus.status === 'running'" class="is-loading" aria-hidden="true"><Loading /></el-icon>
        {{ $t(`filmCreate.${storyboardStatus.status}Status`) }}
      </el-tag>
      <span
        v-if="storyboardStatus.status === 'running' && storyboardProgress != null"
        class="sb-task-progress"
        role="status"
        aria-live="polite"
      >{{ storyboardProgress }}%</span>
      <el-button
        v-if="storyboardStatus.status === 'failed'"
        size="small"
        class="sb-status-retry"
        @click="actions.getSbVideoError(sb.id) ? actions.onGenerateSbVideo(sb) : actions.onGenerateSbImage(sb)"
      >{{ $t('common.retry') }}</el-button>
      <el-tag v-if="!compact && sb.movement" size="small" effect="plain" type="info" class="sb-movement-tag">{{ actions.getMovementLabel(sb.movement) }}</el-tag>
      <el-button v-if="!compact" size="small" plain class="sb-ctrl-btn sb-ctrl-config-btn" @click="actions.onOpenVideoParamsDialog(sb)">{{ $t('filmCreate.storyboardConfig') }}</el-button>
      <el-button
        v-if="!compact"
        size="small"
        plain
        class="sb-ctrl-btn sb-ctrl-mode-btn"
        :title="actions.isSbUniversalMode(sb.id) ? $t('filmCreate.switchToClassicTip') : $t('filmCreate.switchToUniversalTip')"
        @click="actions.onToggleSbUniversalMode(sb)"
      >
        {{ actions.isSbUniversalMode(sb.id) ? $t('filmCreate.classicMode') : $t('filmCreate.universalMode') }}
      </el-button>
      <el-button v-if="!compact" size="small" plain class="sb-ctrl-btn" :title="$t('filmCreate.insertStoryboardBefore')" @click="actions.onInsertStoryboardBefore(sb)">{{ $t('filmCreate.addShort') }}</el-button>
      <el-button
        v-if="!compact"
        class="sb-ctrl-delete"
        type="danger"
        text
        size="small"
        :title="$t('filmCreate.deleteStoryboardN', { num: index + 1 })"
        :aria-label="$t('filmCreate.deleteStoryboardN', { num: index + 1 })"
        @click="actions.onDeleteSingleStoryboard(sb.id)"
      >
        <el-icon><Delete /></el-icon>
      </el-button>
    </div>

    <div v-if="compact" :id="'sb-' + sb.id" class="storyboard-row storyboard-row--compact">
      <img v-if="actions.getSbImage(sb.id)" :src="assetImageUrl(actions.getSbImage(sb.id))" alt="" class="sb-compact-thumb" />
      <span v-else class="sb-compact-thumb sb-compact-thumb--empty" aria-hidden="true">{{ index + 1 }}</span>
      <span class="sb-compact-title">{{ sb.title || $t('filmCreate.unnamedStoryboard') }}</span>
      <el-button v-if="actions.getSbVideoError(sb.id)" size="small" @click="actions.onGenerateSbVideo(sb)">{{ $t('common.retry') }}</el-button>
    </div>
    <div v-else :id="'sb-' + sb.id" class="storyboard-row">
      <!-- 左：分镜脚本 -->
      <div class="sb-panel sb-script">
        <div class="sb-script-row sb-script-selects">
          <el-select
            :model-value="getSbCharacterIds(sb.id)"
            :placeholder="$t('filmCreate.selectCharacter')"
            multiple
            collapse-tags
            collapse-tags-tooltip
            size="small"
            class="sb-select"
            @update:model-value="(v) => actions.setSbCharacterIds(sb.id, v)"
          >
            <el-option
              v-for="c in (characters || [])"
              :key="String(c.id)"
              :label="c.name || $t('common.unnamed')"
              :value="c.id"
            />
            <template v-if="!(characters || []).length" #empty>
              <span class="sb-select-empty">{{ $t('filmCreate.addCharFirstInTab') }}</span>
            </template>
          </el-select>
          <el-select
            :model-value="state.sbSceneId?.[sb.id]"
            :placeholder="$t('filmCreate.selectScene')"
            clearable
            size="small"
            class="sb-select"
            @update:model-value="(v) => (actions.setSbSceneId ? actions.setSbSceneId(sb.id, v) : (state.sbSceneId ? state.sbSceneId[sb.id] = v : null))"
            @change="() => actions.onStoryboardSceneChange(sb.id)"
          >
            <el-option
              v-for="s in (scenes || [])"
              :key="s.id"
              :label="s.location"
              :value="s.id"
            />
          </el-select>
          <el-select
            :model-value="getSbPropIds(sb.id)"
            :placeholder="$t('filmCreate.selectProp')"
            multiple
            collapse-tags
            collapse-tags-tooltip
            size="small"
            class="sb-select"
            @update:model-value="(v) => actions.setSbPropIds(sb.id, v)"
          >
            <el-option
              v-for="p in (propsList || [])"
              :key="String(p.id)"
              :label="p.name || $t('common.unnamed')"
              :value="p.id"
            />
            <template v-if="!(propsList || []).length" #empty>
              <span class="sb-select-empty">{{ $t('filmCreate.addPropFirstInTab') }}</span>
            </template>
          </el-select>
        </div>

        <!-- 当前选中：场景 / 角色 / 物品缩略图 -->
        <div v-if="getSbSelectedScene(sb.id) || getSbSelectedCharacters(sb.id).length || getSbSelectedProps(sb.id).length || (characters || []).length" class="sb-selected-thumbs">
          <div v-if="getSbSelectedScene(sb.id)" class="sb-thumb-row">
            <span class="sb-thumb-label">{{ $t('filmCreate.sceneLabel') }}</span>
            <div class="sb-thumb-list">
              <div
                v-for="s in [getSbSelectedScene(sb.id)]"
                :key="s.id"
                class="sb-thumb-item sb-thumb-scene"
                :class="{ 'sb-thumb-clickable': hasAssetImage(s) }"
                :title="s.location"
                role="button"
                @click="hasAssetImage(s) && actions.openImagePreview(assetImageUrl(s))"
              >
                <img v-if="hasAssetImage(s)" :src="assetImageUrl(s)" alt="" />
                <span v-else class="sb-thumb-placeholder">{{ (s.location || '')[0] }}</span>
              </div>
            </div>
          </div>
          <div v-if="(characters || []).length" class="sb-thumb-row">
            <span class="sb-thumb-label">{{ $t('filmCreate.characterLabel') }}</span>
            <div class="sb-thumb-list">
              <div
                v-for="c in getSbSelectedCharacters(sb.id)"
                :key="c.id"
                class="sb-thumb-item sb-thumb-avatar"
                :class="{ 'sb-thumb-clickable': hasAssetImage(c), 'is-missing-ref': !hasAssetImage(c) }"
                :title="!hasAssetImage(c) ? `${c.name} (${$t('filmCreate.missingCharRefWarning')})` : c.name"
                role="button"
                @click="hasAssetImage(c) && actions.openImagePreview(assetImageUrl(c))"
              >
                <img v-if="hasAssetImage(c)" :src="assetImageUrl(c)" alt="" />
                <span v-else class="sb-thumb-placeholder">{{ (c.name || '')[0] }}</span>
                <span v-if="!hasAssetImage(c)" class="char-missing-badge" :title="$t('filmCreate.missingCharRefWarning')">!</span>
              </div>
              <el-dropdown trigger="click" @command="(cmd) => actions.onSbAddCharacterCommand(sb.id, cmd)">
                <div
                  class="sb-thumb-item sb-thumb-avatar sb-thumb-add-char"
                  :title="$t('filmCreate.addCharacter')"
                  role="button"
                  @click.stop
                >
                  <el-icon><Plus /></el-icon>
                </div>
                <template #dropdown>
                  <el-dropdown-menu class="sb-char-add-dropdown">
                    <el-dropdown-item
                      v-for="c in charactersAvailableToAddToSb(sb.id)"
                      :key="c.id"
                      :command="c.id"
                    >
                      {{ c.name || $t('common.unnamed') }}
                    </el-dropdown-item>
                    <el-dropdown-item v-if="!charactersAvailableToAddToSb(sb.id).length" disabled>
                      {{ $t('filmCreate.allAddedOrNoChars') }}
                    </el-dropdown-item>
                  </el-dropdown-menu>
                </template>
              </el-dropdown>
            </div>
          </div>
          <div v-if="getSbSelectedProps(sb.id).length" class="sb-thumb-row">
            <span class="sb-thumb-label">{{ $t('filmCreate.propLabel') }}</span>
            <div class="sb-thumb-list">
              <div
                v-for="p in getSbSelectedProps(sb.id)"
                :key="p.id"
                class="sb-thumb-item sb-thumb-prop"
                :class="{ 'sb-thumb-clickable': hasAssetImage(p) }"
                :title="p.name"
                role="button"
                @click="hasAssetImage(p) && actions.openImagePreview(assetImageUrl(p))"
              >
                <img v-if="hasAssetImage(p)" :src="assetImageUrl(p)" alt="" />
                <span v-else class="sb-thumb-placeholder">{{ (p.name || '')[0] }}</span>
              </div>
            </div>
          </div>
        </div>

        <!-- 首尾帧模式下隐藏“图片提示词”入口，统一收敛到首/尾帧槽位的“查看提示词” -->
        <div v-if="!storyboardUseFirstLastFrame" class="sb-prompt-label">
          <span class="sb-dot"></span>
          <span>{{ $t('filmCreate.imagePrompt') }}</span>
        </div>
        <div v-if="!storyboardUseFirstLastFrame" class="sb-prompt-row">
          <span class="sb-prompt-text">{{ sb.image_prompt || $t('filmCreate.noImagePrompt') }}</span>
          <el-button size="small" link type="primary" @click="actions.onOpenSbPromptDialog(sb)">{{ $t('common.edit') }}</el-button>
        </div>

        <NarrationSection
          :storyboard-include-narration="storyboardIncludeNarration"
          :draft="state.sbNarration?.[sb.id] || ''"
          :saved="sb.narration || ''"
          :tts-running="state.ttsSbNarrationIds?.has(sb.id)"
          :audio-path="actions.sbNarrationAudioRelPath(sb)"
          @update:draft="state.sbNarration[sb.id] = $event"
          @save="actions.onSaveSbNarrationField(sb)"
          @generate="actions.onTtsSbNarration(sb)"
          @play="actions.playSbNarrationTts(sb)"
        />
      </div>

      <!-- 中：经典模式=分镜参考图；全能模式=片段描述（独立字段，与参考图并存） -->
      <div class="sb-panel sb-image" :class="{ 'sb-image--universal': actions.isSbUniversalMode(sb.id) }">
        <template v-if="actions.isSbUniversalMode(sb.id)">
          <div class="sb-prompt-label sb-universal-label-row">
            <div class="sb-universal-label-left">
              <span class="sb-dot"></span>
              <span>{{ $t('filmCreate.clipExplanation') }}</span>
              <el-tooltip placement="top" :show-after="280" :show-arrow="false" popper-class="sb-universal-tooltip-popper">
                <template #content>
                  <div class="sb-universal-tooltip">
                    {{ $t('filmCreate.universalPromptGuide') }}
                  </div>
                </template>
                <el-icon class="sb-universal-hint-icon" tabindex="0" role="img" :aria-label="$t('filmCreate.clipExplanation')">
                  <QuestionFilled />
                </el-icon>
              </el-tooltip>
            </div>
            <el-dropdown
              trigger="click"
              class="sb-universal-prompt-dd"
              @command="(cmd) => actions.onUniversalSegmentPromptMenu(sb, cmd)"
            >
              <el-button
                type="primary"
                link
                size="small"
                class="sb-universal-gen-btn"
                :loading="state.generatingUniversalSegmentIds?.has(sb.id)"
              >
                {{ $t('filmCreate.universalPrompt') }}
                <el-icon class="sb-universal-dd-caret"><ArrowDown /></el-icon>
              </el-button>
              <template #dropdown>
                <el-dropdown-menu>
                  <el-dropdown-item command="generate">{{ $t('filmCreate.generateUniversalPrompt') }}</el-dropdown-item>
                  <el-dropdown-item command="generate-force">{{ $t('filmCreate.generateUniversalPromptForce') }}</el-dropdown-item>
                  <el-dropdown-item command="polish" :disabled="!actions.sbUniversalSegmentTrimmed(sb)">
                    {{ $t('filmCreate.polishUniversalPrompt') }}
                  </el-dropdown-item>
                  <el-dropdown-item command="polish-force" :disabled="!actions.sbUniversalSegmentTrimmed(sb)">
                    {{ $t('filmCreate.polishUniversalPromptForce') }}
                  </el-dropdown-item>
                  <el-dropdown-item
                    command="to-grok-video-tags"
                    divided
                    :disabled="!actions.sbUniversalSegmentTrimmed(sb)"
                  >
                    {{ $t('filmCreate.toGrokVideoTags') }}
                  </el-dropdown-item>
                </el-dropdown-menu>
              </template>
            </el-dropdown>
          </div>
          <UniversalSegmentOmniAtEditor
            v-if="!state.generatingUniversalSegmentIds?.has(sb.id)"
            v-model="state.sbUniversalSegmentText[sb.id]"
            :slots="actions.getSbUniversalOmniRefSlots(sb)"
            class="sb-universal-textarea"
            @blur="() => actions.onSaveUniversalSegmentField(sb)"
          />
          <el-input
            v-else
            v-model="state.sbUniversalSegmentText[sb.id]"
            type="textarea"
            :rows="10"
            :autosize="{ minRows: 10, maxRows: 22 }"
            :placeholder="$t('filmCreate.universalSegmentPlaceholder')"
            class="sb-universal-textarea"
            @blur="() => actions.onSaveUniversalSegmentField(sb)"
          />
        </template>
        <template v-else>
          <div
            class="sb-image-area"
            :class="{
              'sb-image-area--dragover': state.dragOverSbId === sb.id,
              'sb-image-area--has-quad': !storyboardUseFirstLastFrame && actions.getStripItems(sb.id).length > 0,
              'sb-image-area--first-last': storyboardUseFirstLastFrame,
            }"
            @dragover="actions.onSbImageDragOver($event, sb.id)"
            @dragleave="actions.onSbImageDragLeave($event, sb.id)"
            @drop="actions.onSbImageDrop($event, sb)"
          >
            <!-- 首尾帧双槽 -->
            <template v-if="storyboardUseFirstLastFrame">
              <div class="sb-fl-dual">
                <div class="sb-fl-slot">
                  <div class="sb-fl-slot-label">{{ $t('filmCreate.firstFrame') }}</div>
                  <div class="sb-fl-slot-body">
                    <template v-if="actions.getSbFirstImage(sb.id)">
                      <img
                        :src="assetImageUrl(actions.getSbFirstImage(sb.id))"
                        class="sb-generated-img"
                        alt=""
                        @click="actions.openImagePreview(assetImageUrl(actions.getSbFirstImage(sb.id)))"
                      />
                    </template>
                    <template v-else-if="sb.image_url || sb.composed_image">
                      <img
                        :src="imageUrl(sb.composed_image || sb.image_url)"
                        class="sb-generated-img"
                        alt=""
                        @click="actions.openImagePreview(imageUrl(sb.composed_image || sb.image_url))"
                      />
                    </template>
                    <template v-else>
                      <span class="sb-fl-empty">{{ $t('filmCreate.staticBeforeAction') }}</span>
                    </template>
                  </div>
                  <div v-if="actions.getSbFirstImage(sb.id)?.prompt" class="sb-fl-slot-prompt" :title="actions.getSbFirstImage(sb.id).prompt">
                    {{ actions.getSbFirstImage(sb.id).prompt }}
                  </div>
                  <div class="sb-fl-slot-actions">
                    <el-button type="primary" size="small" :loading="state.generatingSbFirstImageIds?.has(sb.id)" @click="actions.onGenerateSbFrameImage(sb, 'first')">{{ $t('common.generate') }}</el-button>
                    <el-tooltip v-if="actions.canUsePrevTailAsFirst(sb)" :content="$t('filmCreate.usePrevTailAsFirstTip')" placement="top">
                      <el-button size="small" :loading="state.usingPrevTailAsFirstIds?.has(sb.id)" @click="actions.onUsePrevTailAsFirst(sb)">{{ $t('filmCreate.prevTailFrame') }}</el-button>
                    </el-tooltip>
                    <el-button size="small" :loading="uploadingSbImageSlot(sb.id) === 'first'" @click="actions.onUploadSbImageClick(sb, 'first')">{{ $t('common.upload') }}</el-button>
                    <el-button type="primary" link size="small" @click="actions.showSbFramePromptPreview(sb, 'first')">{{ $t('filmCreate.viewPrompt') }}</el-button>
                  </div>
                </div>
                <div class="sb-fl-arrow" aria-hidden="true">→</div>
                <div class="sb-fl-slot">
                  <div class="sb-fl-slot-label">{{ $t('filmCreate.lastFrame') }}</div>
                  <div class="sb-fl-slot-body">
                    <template v-if="actions.getSbLastImage(sb.id)">
                      <img
                        :src="assetImageUrl(actions.getSbLastImage(sb.id))"
                        class="sb-generated-img"
                        alt=""
                        :title="actions.getSbLastImage(sb.id).prompt || ''"
                        @click="actions.openImagePreview(assetImageUrl(actions.getSbLastImage(sb.id)))"
                      />
                    </template>
                    <template v-else>
                      <span class="sb-fl-empty">{{ $t('filmCreate.resultAfterAction') }}</span>
                    </template>
                  </div>
                  <div v-if="actions.getSbLastImage(sb.id)?.prompt" class="sb-fl-slot-prompt" :title="actions.getSbLastImage(sb.id).prompt">
                    {{ actions.getSbLastImage(sb.id).prompt }}
                  </div>
                  <div class="sb-fl-slot-actions">
                    <el-button type="primary" size="small" :loading="state.generatingSbLastImageIds?.has(sb.id)" @click="actions.onGenerateSbFrameImage(sb, 'last')">{{ $t('common.generate') }}</el-button>
                    <el-checkbox
                      :model-value="lastFrameUseFirstLayoutLock"
                      class="sb-fl-first-lock-opt"
                      :title="$t('filmCreate.firstFramePoseTip')"
                      @update:model-value="actions.onLastFrameLayoutLockChange"
                    >
                      {{ $t('filmCreate.firstFramePosition') }}
                    </el-checkbox>
                    <el-button size="small" :loading="uploadingSbImageSlot(sb.id) === 'last'" @click="actions.onUploadSbImageClick(sb, 'last')">{{ $t('common.upload') }}</el-button>
                    <el-button type="primary" link size="small" @click="actions.showSbFramePromptPreview(sb, 'last')">{{ $t('filmCreate.viewPrompt') }}</el-button>
                  </div>
                </div>
              </div>
              <div v-if="actions.getStripItems(sb.id).length" class="sb-imgs-strip">
                <el-tooltip :content="$t('filmCreate.historyImagesFirstLastTip')" placement="top" :show-arrow="false">
                  <el-icon class="sb-strip-hint-icon"><InfoFilled /></el-icon>
                </el-tooltip>
                <div
                  v-for="item in actions.getStripItems(sb.id)"
                  :key="item.key"
                  class="sb-img-thumb"
                  :title="actions.stripItemTitle(sb.id, item)"
                  @click="actions.onStripItemClick(sb, item)"
                >
                  <img :src="item.src" alt="" />
                  <span v-if="item.frameBadge" class="sb-img-thumb-label">{{ item.frameBadge }}</span>
                  <span v-else-if="item.label" class="sb-img-thumb-label">{{ item.label }}</span>
                  <button class="thumb-preview-btn" :title="$t('filmCreate.zoomPreview')" :aria-label="$t('filmCreate.zoomPreview')" @click.stop="actions.openImagePreview(item.src)">
                    <el-icon :size="10"><ZoomIn /></el-icon>
                  </button>
                  <button v-if="item.img?.id" class="extra-thumb-remove" :title="$t('filmCreate.deleteHistoryImage')" @click.stop="actions.onRemoveSbHistoryImage(sb.id, item.img.id)">×</button>
                </div>
              </div>
            </template>
            <!-- 单主图（未勾选首尾帧） -->
            <template v-else>
              <div class="sb-main-image-wrap">
                <template v-if="actions.getSbImage(sb.id)">
                  <img
                    :src="assetImageUrl(actions.getSbImage(sb.id))"
                    class="sb-generated-img"
                    alt=""
                    :title="actions.getSbImage(sb.id).prompt || ''"
                    @click="actions.openImagePreview(assetImageUrl(actions.getSbImage(sb.id)))"
                  />
                  <div v-if="actions.getSbImage(sb.id).prompt" class="sb-main-img-prompt">{{ actions.getSbImage(sb.id).prompt }}</div>
                </template>
                <template v-else-if="sb.composed_image || sb.image_url">
                  <img
                    :src="imageUrl(sb.composed_image || sb.image_url)"
                    class="sb-generated-img"
                    alt=""
                    @click="actions.openImagePreview(imageUrl(sb.composed_image || sb.image_url))"
                  />
                </template>
                <template v-else-if="sb.error_msg || sb.errorMsg">
                  <div class="sb-image-error" :title="sb.error_msg || sb.errorMsg">{{ sb.error_msg || sb.errorMsg }}</div>
                  <el-button type="primary" size="small" class="sb-gen-btn" :loading="state.generatingSbImageIds?.has(sb.id)" @click="actions.onGenerateSbImage(sb)">
                    <el-icon><Refresh /></el-icon>
                    {{ $t('common.retry') }}
                  </el-button>
                  <el-button size="small" :loading="state.uploadingSbImageId === sb.id" @click="actions.onUploadSbImageClick(sb)">{{ $t('common.upload') }}</el-button>
                </template>
                <template v-else-if="state.generatingSbImageIds?.has(sb.id)">
                  <el-skeleton class="sb-image-skeleton" animated aria-hidden="true">
                    <template #template>
                      <el-skeleton-item variant="image" class="sb-image-skeleton__image" />
                      <el-skeleton-item variant="text" class="sb-image-skeleton__line" />
                    </template>
                  </el-skeleton>
                  <span class="sr-only" role="status">{{ $t('filmCreate.generatingStoryboardImage') }}</span>
                </template>
                <template v-else>
                  <el-button type="primary" size="small" class="sb-gen-btn" :loading="state.generatingSbImageIds?.has(sb.id)" @click="actions.onGenerateSbImage(sb)">
                    <el-icon><MagicStick /></el-icon>
                    {{ $t('filmCreate.generateStoryboardRefImage') }}
                  </el-button>
                  <el-button size="small" :loading="state.uploadingSbImageId === sb.id" @click="actions.onUploadSbImageClick(sb)">{{ $t('common.upload') }}</el-button>
                </template>
              </div>
              <div v-if="actions.getStripItems(sb.id).length" class="sb-imgs-strip">
                <el-tooltip :content="$t('filmCreate.historyImagesMainTip')" placement="top" :show-arrow="false">
                  <el-icon class="sb-strip-hint-icon"><InfoFilled /></el-icon>
                </el-tooltip>
                <div
                  v-for="item in actions.getStripItems(sb.id)"
                  :key="item.key"
                  class="sb-img-thumb"
                  :title="[item.label, item.prompt].filter(Boolean).join('\n\n') || $t('filmCreate.clickSetAsMain')"
                  @click="actions.onSelectStripItem(sb, item)"
                >
                  <img :src="item.src" alt="" />
                  <span v-if="item.label" class="sb-img-thumb-label">{{ item.label }}</span>
                  <button class="thumb-preview-btn" :title="$t('filmCreate.zoomPreview')" :aria-label="$t('filmCreate.zoomPreview')" @click.stop="actions.openImagePreview(item.src)">
                    <el-icon :size="10"><ZoomIn /></el-icon>
                  </button>
                  <button v-if="item.img?.id" class="extra-thumb-remove" :title="$t('filmCreate.deleteHistoryImage')" @click.stop="actions.onRemoveSbHistoryImage(sb.id, item.img.id)">×</button>
                </div>
              </div>
            </template>
            <div v-if="state.dragOverSbId === sb.id" class="sb-image-area-drop-hint">{{ $t('filmCreate.dropUploadToFirstFrame') }}</div>
          </div>
          <div v-if="actions.hasSbImage(sb) || storyboardUseFirstLastFrame" class="sb-image-actions">
            <template v-if="storyboardUseFirstLastFrame">
              <el-button size="small" :loading="state.generatingSbFirstImageIds?.has(sb.id) || state.generatingSbLastImageIds?.has(sb.id)" @click="actions.onGenerateSbFramePair(sb)">{{ actions.hasSbFirstLastPair(sb) ? $t('filmCreate.regenFirstLastPair') : $t('filmCreate.oneClickFirstLastPair') }}</el-button>
              <el-tooltip :content="$t('filmCreate.upscaleFirstFrameTip')" placement="top">
                <el-button size="small" :loading="state.upscalingSbIds?.has(sb.id)" :disabled="!actions.getSbLocalImage(sb)" @click="actions.onUpscaleSbImage(sb)">
                  <el-icon><ZoomIn /></el-icon>{{ $t('filmCreate.upscaleFirstFrame') }}
                </el-button>
              </el-tooltip>
            </template>
            <template v-else>
              <el-button size="small" :loading="state.generatingSbImageIds?.has(sb.id)" @click="actions.onGenerateSbImage(sb)">{{ $t('common.regenerate') }}</el-button>
              <el-button size="small" :loading="state.uploadingSbImageId === sb.id" @click="actions.onUploadSbImageClick(sb)">{{ $t('common.upload') }}</el-button>
              <el-tooltip :content="$t('filmCreate.upscale2xTip')" placement="top">
                <el-button
                  size="small"
                  :loading="state.upscalingSbIds?.has(sb.id)"
                  :disabled="!actions.getSbLocalImage(sb)"
                  @click="actions.onUpscaleSbImage(sb)"
                >
                  <el-icon><ZoomIn /></el-icon>{{ $t('filmCreate.upscale') }}
                </el-button>
              </el-tooltip>
            </template>
          </div>
        </template>
      </div>

      <!-- 右：分镜视频 -->
      <div class="sb-panel sb-video">
        <div v-if="actions.getSbVideo(sb.id)" class="sb-video-area">
          <video
            v-if="assetVideoUrl(actions.getSbVideo(sb.id))"
            :key="actions.sbMainVideoPlayerKey(sb.id)"
            :src="assetVideoUrl(actions.getSbVideo(sb.id))"
            controls
            class="sb-video-player"
            preload="metadata"
          />
          <div
            v-else
            class="sb-video-error"
            :title="actions.getSbVideoError(sb.id) || $t('filmCreate.videoUrlInvalid')"
          >
            <span>{{ actions.getSbVideoError(sb.id) || $t('filmCreate.videoUrlInvalidRegen') }}</span>
            <el-button
              v-if="actions.getSbResumableFailedVideo(sb.id)"
              type="warning"
              link
              size="small"
              class="sb-resume-poll-btn"
              :loading="actions.isSbVideoGenerating(sb.id)"
              @click="actions.onResumeSbVideoPoll(sb)"
            >
              {{ $t('filmCreate.continueQuery') }}
            </el-button>
          </div>
          <span v-if="actions.isSbVideoGenerating(sb.id)" class="sb-video-regenerating-overlay">
            <el-icon class="is-loading"><Loading /></el-icon>
            {{ $t('filmCreate.regeneratingVideo') }}
          </span>
        </div>
        <div v-else class="sb-video-area sb-video-placeholder">
          <span v-if="actions.isSbVideoGenerating(sb.id)" class="sb-video-generating-text">
            <el-icon class="is-loading"><Loading /></el-icon>
            {{ $t('filmCreate.generatingVideoText') }}
          </span>
          <template v-else>
            <div v-if="actions.getSbVideoError(sb.id)" class="sb-video-error">
              <span>{{ actions.getSbVideoError(sb.id) }}</span>
              <el-button
                v-if="actions.getSbResumableFailedVideo(sb.id)"
                type="warning"
                link
                size="small"
                class="sb-resume-poll-btn"
                :loading="actions.isSbVideoGenerating(sb.id)"
                @click="actions.onResumeSbVideoPoll(sb)"
              >
                {{ $t('filmCreate.continueQuery') }}
              </el-button>
            </div>
            <el-button
              type="primary"
              size="small"
              class="sb-generate-video-btn"
              :loading="actions.isSbVideoGenerating(sb.id)"
              :disabled="!actions.sbCanSubmitVideo(sb) || actions.isSbVideoGenerating(sb.id)"
              @click="actions.onGenerateSbVideo(sb)"
            >
              {{ $t('filmCreate.generateVideo') }}
            </el-button>
          </template>
        </div>

        <!-- 视频历史条 -->
        <div v-if="actions.getVideoStripItems(sb.id).length" class="sb-videos-strip">
          <el-tooltip :content="$t('filmCreate.historyVideoTip')" placement="top" :show-arrow="false">
            <el-icon class="sb-strip-hint-icon"><InfoFilled /></el-icon>
          </el-tooltip>
          <div
            v-for="item in actions.getVideoStripItems(sb.id)"
            :key="item.key"
            class="sb-video-thumb"
            :title="$t('filmCreate.clickToSwitchVideo', { label: item.label })"
            @click="actions.onSelectSbMainVideo(sb, item.video)"
          >
            <video :src="item.src" preload="metadata" class="sb-video-thumb-player" />
            <span class="sb-video-thumb-label">{{ item.label }}</span>
          </div>
        </div>

        <div v-if="actions.getSbVideo(sb.id)" class="sb-video-actions">
          <el-button size="small" :loading="actions.isSbVideoGenerating(sb.id)" :disabled="!actions.sbCanSubmitVideo(sb) || actions.isSbVideoGenerating(sb.id)" @click="actions.onGenerateSbVideo(sb)">{{ $t('common.regenerate') }}</el-button>
          <el-tooltip v-if="actions.getNextStoryboard(sb.id)" :content="$t('filmCreate.linkTailFrameToNextTip')" placement="top">
            <el-button size="small" :loading="state.linkingTailFrameIds?.has(sb.id)" @click="actions.onLinkTailFrameToNext(sb)">{{ $t('filmCreate.linkTailFrame') }}</el-button>
          </el-tooltip>
          <el-tooltip v-if="sb.dialogue" :content="$t('filmCreate.dialogueTtsTip')" placement="top">
            <el-button size="small" :loading="state.ttsSbIds?.has(sb.id)" @click="actions.onTtsSbDialogue(sb)">
              {{ $t('filmCreate.dialogueDubbing') }}
            </el-button>
          </el-tooltip>
          <el-tooltip v-if="sb.dialogue && actions.sbDialogueAudioRelPath(sb)" :content="$t('filmCreate.playDialogueDubbing')" placement="top">
            <el-button size="small" :aria-label="$t('filmCreate.playDialogueDubbing')" @click="actions.playSbDialogueTts(sb)">
              <el-icon aria-hidden="true"><VideoPlay /></el-icon>
            </el-button>
          </el-tooltip>
        </div>

        <div class="sb-video-prompt-label">
          <span class="sb-dot"></span>
          <span>{{ $t('filmCreate.videoPrompt') }}</span>
        </div>
        <div class="sb-video-params-bar">
          <span :class="['sb-video-prompt-text', 'sb-video-prompt-text--preview', { 'is-expanded': videoPromptExpanded }]">{{ sb.video_prompt || $t('filmCreate.noVideoPromptPlaceholder') }}</span>
          <el-button v-if="(sb.video_prompt || '').length > 160" size="small" link type="primary" @click="videoPromptExpanded = !videoPromptExpanded">
            {{ videoPromptExpanded ? $t('filmCreate.showLess') : $t('filmCreate.showMore') }}
          </el-button>
          <el-button size="small" link type="primary" @click="actions.onOpenSbPromptDialog(sb)">{{ $t('filmCreate.manualEdit') }}</el-button>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup>
import {
  Delete, Plus, QuestionFilled, ArrowDown, InfoFilled, ZoomIn,
  Refresh, MagicStick, VideoPlay, Loading
} from '@element-plus/icons-vue'
import { computed, ref } from 'vue'
import UniversalSegmentOmniAtEditor from '@/components/UniversalSegmentOmniAtEditor.vue'
import NarrationSection from './NarrationSection.vue'
import { assetImageUrl, hasAssetImage, assetVideoUrl, imageUrl } from '@/utils/mediaUrl'
import { getStoryboardStatus } from '@/utils/storyboardStatus'

const props = defineProps({
  sb: { type: Object, required: true },
  index: { type: Number, required: true },
  characters: { type: Array, default: () => [] },
  scenes: { type: Array, default: () => [] },
  propsList: { type: Array, default: () => [] },
  storyboardUseFirstLastFrame: { type: Boolean, default: false },
  storyboardIncludeNarration: { type: Boolean, default: false },
  lastFrameUseFirstLayoutLock: { type: Boolean, default: false },
  state: { type: Object, required: true },
  actions: { type: Object, required: true },
  compact: { type: Boolean, default: false },
  selected: { type: Boolean, default: false },
})
defineEmits(['toggle-selected'])
const videoPromptExpanded = ref(false)
const storyboardStatus = computed(() => getStoryboardStatus({
  error: props.actions.getSbVideoError(props.sb.id) || props.sb.error_msg || props.sb.errorMsg || '',
  hasVideo: Boolean(props.actions.getSbVideo(props.sb.id)),
  isRunning: Boolean(
    props.actions.isSbVideoGenerating(props.sb.id)
    || props.state.generatingSbImageIds?.has(props.sb.id)
    || props.state.generatingSbFirstImageIds?.has(props.sb.id)
    || props.state.generatingSbLastImageIds?.has(props.sb.id)
  ),
}))
const storyboardProgress = computed(() => props.actions.getStoryboardTaskProgress?.(props.sb.id) ?? null)

function getSbCharacterIds(sbId) {
  const arr = props.state.sbCharacterIds?.[sbId]
  return Array.isArray(arr) && arr.length > 0 ? arr : []
}

function getSbPropIds(sbId) {
  const arr = props.state.sbPropIds?.[sbId]
  return Array.isArray(arr) && arr.length > 0 ? arr : []
}

function getSbSelectedScene(sbId) {
  const sceneId = props.state.sbSceneId?.[sbId]
  if (sceneId == null) return null
  return props.scenes.find((s) => Number(s.id) === Number(sceneId)) || null
}

function getSbSelectedCharacters(sbId) {
  const ids = getSbCharacterIds(sbId)
  if (!ids.length) return []
  return ids.map((id) => props.characters.find((c) => Number(c.id) === Number(id))).filter(Boolean)
}

function getSbSelectedProps(sbId) {
  const ids = getSbPropIds(sbId)
  if (!ids.length) return []
  return ids.map((id) => props.propsList.find((p) => Number(p.id) === Number(id))).filter(Boolean)
}

function charactersAvailableToAddToSb(sbId) {
  const all = props.characters ?? []
  const cur = new Set((getSbCharacterIds(sbId) || []).map((x) => Number(x)))
  return all.filter((c) => c && !cur.has(Number(c.id)))
}

function uploadingSbImageSlot(sbId) {
  return props.state.sbImageUploadSlotById?.[sbId]
}
</script>

<style scoped>
.sb-image-skeleton { width:100%; display:grid; gap:8px; }
.sb-image-skeleton__image { width:100%; height:220px; }
.sb-image-skeleton__line { width:72%; }
.sr-only {
  position:absolute;
  width:1px;
  height:1px;
  padding:0;
  margin:-1px;
  overflow:hidden;
  clip:rect(0, 0, 0, 0);
  white-space:nowrap;
  border:0;
}
.sb-card-wrapper {
  margin-bottom: 24px;
}
.sb-task-progress {
  color: var(--text-muted);
  font-size: var(--font-xs);
  font-variant-numeric: tabular-nums;
}
.storyboard-row--compact { align-items:center; gap:var(--space-3); min-height:58px; padding:var(--space-2) var(--space-3); }
.sb-compact-thumb { width:48px; height:40px; object-fit:cover; border-radius:var(--radius-sm); flex:none; }
.sb-compact-thumb--empty { display:grid; place-items:center; color:var(--text-muted); background:var(--surface-2); }
.sb-compact-title { flex:1; min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap; }
.sb-ctrl-bar {
  display: flex;
  align-items: center;
  gap: 6px;
  margin-left: 32px;
  margin-bottom: 4px;
  height: 26px;
}
.sb-ctrl-bar--compact { height:auto; min-height:48px; margin:0; padding:var(--space-2); }
.sb-ctrl-num {
  background: var(--el-color-primary);
  color: #fff;
  border-radius: 5px;
  width: 22px;
  height: 22px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 11px;
  font-weight: 700;
  flex-shrink: 0;
}
.sb-ctrl-title {
  font-size: 0.9rem;
  font-weight: 600;
  color: #e4e4e7;
  max-width: 12em;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
html.light .sb-ctrl-title {
  color: #000;
}
.sb-movement-tag.el-tag {
  height: 18px;
  line-height: 18px;
  padding: 0 6px;
  font-size: 11px;
  margin-left: 6px;
  flex-shrink: 0;
}
.sb-ctrl-btn.el-button {
  height: 22px;
  padding: 0 8px;
  font-size: 11px;
}
.sb-ctrl-config-btn.el-button {
  border-color: rgba(139,92,246,0.45);
  color: #a78bfa;
  background: rgba(139,92,246,0.08);
}
.sb-ctrl-config-btn.el-button:hover {
  border-color: #8b5cf6;
  color: #fff;
  background: rgba(139,92,246,0.6);
}
html.light .sb-ctrl-config-btn.el-button {
  border-color: var(--border-muted);
  color: var(--text-primary);
  background: transparent;
}
html.light .sb-ctrl-config-btn.el-button:hover {
  border-color: var(--text-bright);
  color: var(--text-bright);
  background: var(--bg-hover);
}
.sb-ctrl-delete {
  margin-left: auto;
  opacity: 0.4;
  transition: opacity 0.2s;
  height: 22px;
  padding: 0 4px;
}
.sb-ctrl-bar:hover .sb-ctrl-delete {
  opacity: 1;
}
.storyboard-row {
  display: flex;
  background: var(--bg-card);
  border-radius: var(--radius-lg);
  border: 1px solid var(--border-color);
  overflow: hidden;
  position: relative;
  transition: border-color var(--dur-fast) var(--ease-mech);
  box-shadow: none;
}
.storyboard-row:hover {
  border-color: var(--border-muted);
  box-shadow: none;
}
html.light .storyboard-row {
  background: var(--bg-card);
  border-color: var(--border-color);
  box-shadow: none;
}
html.light .storyboard-row:hover {
  border-color: var(--border-muted);
  box-shadow: none;
}
.sb-panel {
  flex: 1;
  min-width: 0;
  padding: 14px 16px;
  border-right: 1px solid rgba(255,255,255,0.05);
  display: flex;
  flex-direction: column;
}
html.light .sb-panel {
  border-right-color: rgba(139,92,246,0.08);
}
.sb-panel:last-child { border-right: none; }
.sb-script { padding-top: 10px; }
.sb-script-row {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.sb-select { flex: 1; min-width: 0; }
.sb-select-empty { font-size: 0.8rem; color: #71717a; padding: 8px; }
.sb-selected-thumbs {
  margin: 10px 0;
  padding: 8px 0;
  border-top: 1px solid rgba(255, 255, 255, 0.06);
}
.sb-thumb-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}
.sb-thumb-row:last-child { margin-bottom: 0; }
.sb-thumb-label {
  font-size: 0.8rem;
  color: #71717a;
  flex-shrink: 0;
  width: 36px;
}
.sb-thumb-list {
  display: flex;
  flex-wrap: wrap;
  gap: 6px;
  align-items: center;
}
.sb-thumb-item {
  flex-shrink: 0;
  border-radius: 6px;
  overflow: hidden;
  background: #22232d;
}
.sb-thumb-item.sb-thumb-clickable {
  cursor: pointer;
}
.sb-thumb-avatar {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  position: relative;
}
.sb-thumb-avatar.is-missing-ref {
  box-shadow: 0 0 0 1.5px var(--el-color-warning);
}
.char-missing-badge {
  position: absolute;
  top: -2px;
  right: -2px;
  width: 12px;
  height: 12px;
  background: var(--el-color-warning);
  color: #fff;
  border-radius: 50%;
  font-size: 9px;
  font-weight: bold;
  display: flex;
  align-items: center;
  justify-content: center;
  line-height: 1;
}
.sb-thumb-scene {
  width: 48px;
  height: 32px;
}
.sb-thumb-prop {
  width: 32px;
  height: 32px;
}
.sb-thumb-item img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
}
.sb-thumb-add-char {
  display: flex;
  align-items: center;
  justify-content: center;
  cursor: pointer;
  border: 1.5px dashed #52525b;
  background: transparent;
  color: #a1a1aa;
  transition: color 0.15s, border-color 0.15s, background 0.15s;
}
.sb-thumb-add-char:hover {
  color: #e4e4e7;
  border-color: #71717a;
  background: rgba(63, 63, 70, 0.5);
}
html.light .sb-thumb-add-char {
  border-color: #d4d4d8;
  color: #71717a;
}
html.light .sb-thumb-add-char:hover {
  color: #18181b;
  border-color: #a1a1aa;
}
.sb-thumb-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.75rem;
  color: #7a7a88;
  background: #2a2b36;
}
.sb-prompt-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
  font-size: 0.85rem;
  color: #e4e4e7;
}
.sb-prompt-row {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin-bottom: 8px;
}
.sb-prompt-text {
  font-size: 0.85rem;
  color: #a1a1aa;
  line-height: 1.5;
  flex: 1;
}
.sb-narration-input {
  margin-bottom: 8px;
}
.sb-narration-actions {
  display: flex;
  gap: 8px;
  margin-bottom: 8px;
}
.sb-image-area {
  flex: 1;
  min-height: 200px;
  max-height: 320px;
  background: linear-gradient(145deg, #1a1b24 0%, #1e1f28 60%, #1c1d26 100%);
  border: 1px dashed rgba(255, 255, 255, 0.08);
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  overflow: hidden;
  position: relative;
  transition: border-color 0.2s, background 0.2s;
}
.sb-image-area:hover {
  border-color: rgba(255, 255, 255, 0.15);
}
html.light .sb-image-area {
  background: linear-gradient(145deg, #f5f3ff 0%, #ede9fe 100%);
  border-color: rgba(124,58,237,0.2);
}
html.light .sb-image-area:hover {
  border-color: rgba(124,58,237,0.45);
}
.sb-image-area--dragover {
  outline: 2px dashed var(--el-color-primary);
  outline-offset: -2px;
  background: rgba(64, 158, 255, 0.1);
}
.sb-image-area-drop-hint {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 0.9rem;
  border-radius: 8px;
  pointer-events: none;
}
.sb-generated-img {
  max-width: 100%;
  max-height: 100%;
  width: auto;
  height: auto;
  object-fit: contain;
  cursor: pointer;
}
.sb-main-image-wrap {
  width: 100%;
  height: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.sb-main-img-prompt {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.7);
  color: #d1d5db;
  font-size: 11px;
  line-height: 1.4;
  padding: 4px 8px;
  max-height: 44px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.sb-image-error {
  color: #f87171;
  font-size: 0.8rem;
  text-align: center;
  padding: 8px;
}
.sb-gen-btn {
  display: flex;
  align-items: center;
  gap: 4px;
}
.sb-image-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
}
.sb-image-area--first-last {
  min-height: 220px;
  max-height: none;
  padding: 8px;
  align-items: stretch;
  justify-content: flex-start;
}
.sb-fl-dual {
  display: flex;
  align-items: stretch;
  gap: 8px;
  width: 100%;
  flex: 1;
  min-height: 180px;
}
.sb-fl-slot {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 6px;
}
.sb-fl-slot-label {
  font-size: 0.72rem;
  font-weight: 600;
  color: #a1a1aa;
}
.sb-fl-slot-body {
  flex: 1;
  min-height: 120px;
  background: #14151b;
  border-radius: 6px;
  display: flex;
  align-items: center;
  justify-content: center;
  overflow: hidden;
}
.sb-fl-empty {
  font-size: 0.75rem;
  color: #71717a;
  text-align: center;
  padding: 8px;
}
.sb-fl-slot-prompt {
  font-size: 0.7rem;
  color: #71717a;
  line-height: 1.3;
  max-height: 32px;
  overflow: hidden;
  text-overflow: ellipsis;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
}
.sb-fl-slot-actions {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
  align-items: center;
}
.sb-fl-arrow {
  display: flex;
  align-items: center;
  color: #71717a;
  font-size: 1.1rem;
}
.sb-fl-first-lock-opt {
  margin-left: 4px;
  font-size: 11px;
}
.sb-imgs-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 6px 0;
  width: 100%;
}
.sb-strip-hint-icon {
  color: #71717a;
  font-size: 14px;
  flex-shrink: 0;
}
.sb-img-thumb {
  position: relative;
  width: 48px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.sb-img-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}
.sb-img-thumb-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0, 0, 0, 0.6);
  color: #fff;
  font-size: 9px;
  text-align: center;
  padding: 1px 0;
}
.thumb-preview-btn {
  position: absolute;
  top: 2px;
  left: 2px;
  background: rgba(0, 0, 0, 0.6);
  border: none;
  color: #fff;
  border-radius: 2px;
  cursor: pointer;
  padding: 2px;
  opacity: 0;
  transition: opacity 0.15s;
}
.extra-thumb-remove {
  position: absolute;
  top: 2px;
  right: 2px;
  background: rgba(239, 68, 68, 0.8);
  border: none;
  color: #fff;
  border-radius: 2px;
  cursor: pointer;
  font-size: 10px;
  line-height: 1;
  padding: 2px 4px;
  opacity: 0;
  transition: opacity 0.15s;
}
.sb-img-thumb:hover .extra-thumb-remove,
.sb-img-thumb:hover .thumb-preview-btn {
  opacity: 1;
}
.sb-video-area {
  flex: 1;
  min-height: 200px;
  max-height: 320px;
  background: #14151b;
  border-radius: 10px;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  position: relative;
  overflow: hidden;
}
.sb-video-player {
  max-width: 100%;
  max-height: 100%;
  width: 100%;
  height: 100%;
  object-fit: contain;
}
.sb-video-placeholder {
  border: 1px dashed rgba(255, 255, 255, 0.08);
}
.sb-video-error {
  color: #f87171;
  font-size: 0.8rem;
  text-align: center;
  padding: 8px;
}
.sb-resume-poll-btn {
  margin-top: 4px;
}
.sb-video-regenerating-overlay,
.sb-video-generating-text {
  display: flex;
  align-items: center;
  gap: 6px;
  color: #a1a1aa;
  font-size: 0.85rem;
}
.sb-generate-video-btn {
  margin: auto;
}
.sb-videos-strip {
  display: flex;
  align-items: center;
  gap: 6px;
  overflow-x: auto;
  padding: 6px 0;
  width: 100%;
}
.sb-video-thumb {
  position: relative;
  width: 54px;
  height: 36px;
  flex-shrink: 0;
  border-radius: 4px;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgba(255, 255, 255, 0.1);
}
.sb-video-thumb-player {
  width: 100%;
  height: 100%;
  object-fit: cover;
  pointer-events: none;
}
.sb-video-thumb-label {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: rgba(0,0,0,0.55);
  color: #e4e4e7;
  font-size: 0.65rem;
  text-align: center;
  padding: 1px 0;
  pointer-events: none;
}
.sb-video-actions {
  display: flex;
  gap: 8px;
  margin-top: 8px;
  align-items: center;
  flex-wrap: wrap;
}
.sb-video-prompt-label {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
  font-size: 0.85rem;
  color: #e4e4e7;
}
.sb-dot {
  display: inline-block;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: #a855f7;
  flex-shrink: 0;
}
.sb-video-params-bar {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  margin: 4px 0;
}
.sb-video-prompt-text {
  font-size: 0.85rem;
  color: #a1a1aa;
  line-height: 1.5;
  flex: 1;
}
.sb-video-prompt-text--preview {
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  word-break: break-all;
}
.sb-video-prompt-text--preview.is-expanded {
  display: block;
  overflow: visible;
  white-space: pre-wrap;
  word-break: break-word;
}
.sb-ctrl-mode-btn.el-button {
  border-color: rgba(34, 197, 94, 0.35);
  color: #86efac;
  background: rgba(34, 197, 94, 0.08);
}
.sb-ctrl-mode-btn.el-button:hover {
  border-color: #22c55e;
  color: #fff;
  background: rgba(34, 197, 94, 0.45);
}
html.light .sb-ctrl-mode-btn.el-button {
  border-color: rgba(22, 163, 74, 0.35);
  color: #15803d;
  background: rgba(22, 163, 74, 0.06);
}
html.light .sb-ctrl-mode-btn.el-button:hover {
  border-color: #16a34a;
  color: #fff;
  background: #16a34a;
}
.sb-universal-label-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.sb-universal-label-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.sb-universal-hint-icon {
  color: #94a3b8;
  font-size: 14px;
  cursor: help;
}
.sb-universal-gen-btn {
  font-size: 12px;
}
.sb-universal-dd-caret {
  margin-left: 2px;
  font-size: 12px;
}
.sb-universal-textarea {
  flex: 1;
  min-height: 220px;
}
</style>
