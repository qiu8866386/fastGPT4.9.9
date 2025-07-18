import MyModal from '@fastgpt/web/components/common/MyModal';
import { useTranslation } from 'next-i18next';
import { type UseFormReturn } from 'react-hook-form';
import { useSystemStore } from '@/web/common/system/useSystemStore';
import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Box,
  Flex,
  Input,
  Button,
  ModalBody,
  ModalFooter,
  Textarea,
  useDisclosure,
  Checkbox,
  HStack
} from '@chakra-ui/react';
import MyIcon from '@fastgpt/web/components/common/Icon';
import LeftRadio from '@fastgpt/web/components/common/Radio/LeftRadio';
import type {
  ChunkTriggerConfigTypeEnum,
  ParagraphChunkAIModeEnum
} from '@fastgpt/global/core/dataset/constants';
import {
  DataChunkSplitModeEnum,
  DatasetCollectionDataProcessModeEnum,
  DatasetCollectionDataProcessModeMap
} from '@fastgpt/global/core/dataset/constants';
import { ChunkSettingModeEnum } from '@fastgpt/global/core/dataset/constants';
import MyTooltip from '@fastgpt/web/components/common/MyTooltip';
import { Prompt_AgentQA } from '@fastgpt/global/core/ai/prompt/agent';
import { useContextSelector } from 'use-context-selector';
import FormLabel from '@fastgpt/web/components/common/MyBox/FormLabel';
import MyNumberInput from '@fastgpt/web/components/common/Input/NumberInput';
import QuestionTip from '@fastgpt/web/components/common/MyTooltip/QuestionTip';
import { DatasetPageContext } from '@/web/core/dataset/context/datasetPageContext';
import MySelect from '@fastgpt/web/components/common/MySelect';
import {
  chunkAutoChunkSize,
  getAutoIndexSize,
  getIndexSizeSelectList,
  getLLMDefaultChunkSize,
  getLLMMaxChunkSize,
  getMaxChunkSize,
  getMaxIndexSize,
  minChunkSize
} from '@fastgpt/global/core/dataset/training/utils';
import RadioGroup from '@fastgpt/web/components/common/Radio/RadioGroup';
import type { LLMModelItemType, EmbeddingModelItemType } from '@fastgpt/global/core/ai/model.d';

const PromptTextarea = ({
  defaultValue = '',
  onChange,
  onClose
}: {
  defaultValue?: string;
  onChange: (e: string) => void;
  onClose: () => void;
}) => {
  const ref = useRef<HTMLTextAreaElement>(null);
  const { t } = useTranslation();

  return (
    <MyModal
      isOpen
      title={t('common:core.dataset.import.Custom prompt')}
      iconSrc="modal/edit"
      w={'600px'}
      onClose={onClose}
    >
      <ModalBody whiteSpace={'pre-wrap'} fontSize={'sm'} px={[3, 6]} pt={[3, 6]}>
        <Textarea ref={ref} rows={8} fontSize={'sm'} defaultValue={defaultValue} />
        <Box>{Prompt_AgentQA.fixedText}</Box>
      </ModalBody>
      <ModalFooter>
        <Button
          onClick={() => {
            const val = ref.current?.value || Prompt_AgentQA.description;
            onChange(val);
            onClose();
          }}
        >
          {t('common:Confirm')}
        </Button>
      </ModalFooter>
    </MyModal>
  );
};

export type CollectionChunkFormType = {
  trainingType: DatasetCollectionDataProcessModeEnum;

  // Chunk trigger
  chunkTriggerType: ChunkTriggerConfigTypeEnum;
  chunkTriggerMinSize: number; // maxSize from agent model, not store

  // Data enhance
  dataEnhanceCollectionName: boolean; // Auto add collection name to data

  // Index enhance
  imageIndex: boolean;
  autoIndexes: boolean;

  // Chunk setting
  chunkSettingMode: ChunkSettingModeEnum; // 系统参数/自定义参数
  chunkSplitMode: DataChunkSplitModeEnum;
  // Paragraph split
  paragraphChunkAIMode: ParagraphChunkAIModeEnum;
  paragraphChunkDeep: number; // Paragraph deep
  paragraphChunkMinSize: number; // Paragraph min size, if too small, it will merge
  paragraphChunkMaxSize: number; // Paragraph max size, if too large, it will split
  // Size split
  chunkSize: number;
  // Char split
  chunkSplitter: string;
  indexSize: number;

  qaPrompt?: string;
};

const CollectionChunkForm = ({ form }: { form: UseFormReturn<CollectionChunkFormType> }) => {
  const { t } = useTranslation();
  const { feConfigs } = useSystemStore();

  const datasetDetail = useContextSelector(DatasetPageContext, (v) => v.datasetDetail);

  const vectorModel = datasetDetail.vectorModel;
  const agentModel = datasetDetail.agentModel;

  const { setValue, register, watch, getValues } = form;

  const trainingType = watch('trainingType');
  const chunkSettingMode = watch('chunkSettingMode');
  const chunkSplitMode = watch('chunkSplitMode');
  const autoIndexes = watch('autoIndexes');
  const indexSize = watch('indexSize');
  const imageIndex = watch('imageIndex');

  const trainingModeList = useMemo(() => {
    const list = {
      [DatasetCollectionDataProcessModeEnum.chunk]:
        DatasetCollectionDataProcessModeMap[DatasetCollectionDataProcessModeEnum.chunk],
      [DatasetCollectionDataProcessModeEnum.qa]:
        DatasetCollectionDataProcessModeMap[DatasetCollectionDataProcessModeEnum.qa]
    };

    return Object.entries(list).map(([key, value]) => ({
      title: t(value.label as any),
      value: key as DatasetCollectionDataProcessModeEnum,
      tooltip: t(value.tooltip as any)
    }));
  }, [t]);

  const {
    maxChunkSize,
    minChunkSize: minChunkSizeValue,
    maxIndexSize
  } = useMemo(() => {
    if (trainingType === DatasetCollectionDataProcessModeEnum.qa) {
      return {
        maxChunkSize: getLLMMaxChunkSize(agentModel),
        minChunkSize: 1000,
        maxIndexSize: 1000
      };
    } else if (autoIndexes) {
      return {
        maxChunkSize: getMaxChunkSize(agentModel),
        minChunkSize: minChunkSize,
        maxIndexSize: getMaxIndexSize(vectorModel)
      };
    } else {
      return {
        maxChunkSize: getMaxChunkSize(agentModel),
        minChunkSize: minChunkSize,
        maxIndexSize: getMaxIndexSize(vectorModel)
      };
    }
  }, [trainingType, autoIndexes, agentModel, vectorModel]);

  // Custom split list
  const customSplitList = [
    { label: t('dataset:split_sign_null'), value: '' },
    { label: t('dataset:split_sign_break'), value: '\\n' },
    { label: t('dataset:split_sign_break2'), value: '\\n\\n' },
    { label: t('dataset:split_sign_period'), value: '.|。' },
    { label: t('dataset:split_sign_exclamatiob'), value: '!|！' },
    { label: t('dataset:split_sign_question'), value: '?|？' },
    { label: t('dataset:split_sign_semicolon'), value: ';|；' },
    { label: '=====', value: '=====' },
    { label: t('dataset:split_sign_custom'), value: 'Other' }
  ];
  const [customListSelectValue, setCustomListSelectValue] = useState(getValues('chunkSplitter'));
  useEffect(() => {
    if (customListSelectValue === 'Other') {
      setValue('chunkSplitter', '');
    } else {
      setValue('chunkSplitter', customListSelectValue);
    }
  }, [customListSelectValue, setValue]);

  // Index size
  const indexSizeSeletorList = useMemo(() => getIndexSizeSelectList(maxIndexSize), [maxIndexSize]);

  // QA
  const qaPrompt = watch('qaPrompt');
  const {
    isOpen: isOpenCustomPrompt,
    onOpen: onOpenCustomPrompt,
    onClose: onCloseCustomPrompt
  } = useDisclosure();

  const showQAPromptInput = trainingType === DatasetCollectionDataProcessModeEnum.qa;

  // Adapt 4.9.0- auto training
  useEffect(() => {
    if (trainingType === DatasetCollectionDataProcessModeEnum.auto) {
      setValue('autoIndexes', true);
      setValue('trainingType', DatasetCollectionDataProcessModeEnum.chunk);
    }
  }, [trainingType, setValue]);

  return (
    <>
      <Box>
        <Box fontSize={'sm'} mb={2} color={'myGray.600'}>
          {t('dataset:training_mode')}
        </Box>
        <LeftRadio<DatasetCollectionDataProcessModeEnum>
          list={trainingModeList}
          px={3}
          py={2.5}
          value={trainingType}
          onChange={(e) => {
            setValue('trainingType', e);
            if (e === DatasetCollectionDataProcessModeEnum.qa) {
              setValue('chunkSize', getLLMDefaultChunkSize(agentModel));
            } else {
              setValue('chunkSize', chunkAutoChunkSize);
            }
          }}
          defaultBg="white"
          activeBg="white"
          gridTemplateColumns={'repeat(2, 1fr)'}
        />
      </Box>
      {/* {trainingType === DatasetCollectionDataProcessModeEnum.chunk &&
        feConfigs?.show_dataset_enhance !== false && (
          <Box mt={6}>
            <Box fontSize={'sm'} mb={2} color={'myGray.600'}>
              {t('dataset:enhanced_indexes')}
            </Box>
            <HStack gap={[3, 7]}>
              <HStack flex={'1'} spacing={1}>
                <MyTooltip label={!feConfigs?.isPlus ? t('common:commercial_function_tip') : ''}>
                  <Checkbox
                    isDisabled={!feConfigs?.isPlus}
                    isChecked={autoIndexes}
                    {...register('autoIndexes')}
                  >
                    <FormLabel>{t('dataset:auto_indexes')}</FormLabel>
                  </Checkbox>
                </MyTooltip>
                <QuestionTip label={t('dataset:auto_indexes_tips')} />
              </HStack>
              <HStack flex={'1'} spacing={1}>
                <MyTooltip
                  label={
                    !feConfigs?.isPlus
                      ? t('common:commercial_function_tip')
                      : !datasetDetail?.vlmModel
                        ? t('common:error_vlm_not_config')
                        : ''
                  }
                >
                  <Checkbox
                    isDisabled={!feConfigs?.isPlus || !datasetDetail?.vlmModel}
                    isChecked={imageIndex}
                    {...register('imageIndex')}
                  >
                    <FormLabel>{t('dataset:image_auto_parse')}</FormLabel>
                  </Checkbox>
                </MyTooltip>
                <QuestionTip label={t('dataset:image_auto_parse_tips')} />
              </HStack>
            </HStack>
          </Box>
        )} */}
      <Box mt={6}>
        <Box fontSize={'sm'} mb={2} color={'myGray.600'}>
          {t('dataset:params_setting')}
        </Box>
        <LeftRadio<ChunkSettingModeEnum>
          list={[
            {
              title: t('dataset:default_params'),
              desc: t('dataset:default_params_desc'),
              value: ChunkSettingModeEnum.auto
            },
            {
              title: t('dataset:custom_data_process_params'),
              desc: t('dataset:custom_data_process_params_desc'),
              value: ChunkSettingModeEnum.custom,
              children: chunkSettingMode === ChunkSettingModeEnum.custom && (
                <Box mt={5}>
                  <Box>
                    <RadioGroup<DataChunkSplitModeEnum>
                      list={[
                        {
                          title: t('dataset:split_chunk_size'),
                          value: DataChunkSplitModeEnum.size
                        },
                        {
                          title: t('dataset:split_chunk_char'),
                          value: DataChunkSplitModeEnum.char,
                          tooltip: t('dataset:custom_split_sign_tip')
                        }
                      ]}
                      value={chunkSplitMode}
                      onChange={(e) => {
                        setValue('chunkSplitMode', e);
                      }}
                    />

                    {chunkSplitMode === DataChunkSplitModeEnum.size && (
                      <Box
                        mt={1.5}
                        css={{
                          '& > span': {
                            display: 'block'
                          }
                        }}
                      >
                        <MyTooltip
                          label={t('common:core.dataset.import.Chunk Range', {
                            min: minChunkSizeValue,
                            max: maxChunkSize
                          })}
                        >
                          <MyNumberInput
                            register={register}
                            name={'chunkSize'}
                            min={minChunkSizeValue}
                            max={maxChunkSize}
                            size={'sm'}
                            step={100}
                          />
                        </MyTooltip>
                      </Box>
                    )}

                    {chunkSplitMode === DataChunkSplitModeEnum.char && (
                      <HStack mt={1.5}>
                        <Box flex={'1 0 0'}>
                          <MySelect<string>
                            list={customSplitList}
                            size={'sm'}
                            bg={'myGray.50'}
                            value={customListSelectValue}
                            h={'32px'}
                            onChange={(val) => {
                              setCustomListSelectValue(val);
                            }}
                          />
                        </Box>
                        {customListSelectValue === 'Other' && (
                          <Input
                            flex={'1 0 0'}
                            h={'32px'}
                            size={'sm'}
                            bg={'myGray.50'}
                            placeholder="\n;======;==SPLIT=="
                            {...register('chunkSplitter')}
                          />
                        )}
                      </HStack>
                    )}
                  </Box>

                  {trainingType === DatasetCollectionDataProcessModeEnum.chunk && (
                    <Box>
                      <Flex alignItems={'center'} mt={3}>
                        <Box>{t('dataset:index_size')}</Box>
                        <QuestionTip label={t('dataset:index_size_tips')} />
                      </Flex>
                      <Box mt={1}>
                        <MySelect<number>
                          bg={'myGray.50'}
                          list={indexSizeSeletorList}
                          value={indexSize}
                          onChange={(val) => {
                            setValue('indexSize', val);
                          }}
                        />
                      </Box>
                    </Box>
                  )}

                  {showQAPromptInput && (
                    <Box mt={3}>
                      <Box>{t('common:core.dataset.collection.QA Prompt')}</Box>
                      <Box
                        position={'relative'}
                        py={2}
                        px={3}
                        bg={'myGray.50'}
                        fontSize={'xs'}
                        whiteSpace={'pre-wrap'}
                        border={'1px'}
                        borderColor={'borderColor.base'}
                        borderRadius={'md'}
                        maxH={'140px'}
                        overflow={'auto'}
                        _hover={{
                          '& .mask': {
                            display: 'block'
                          }
                        }}
                      >
                        {qaPrompt}

                        <Box
                          display={'none'}
                          className="mask"
                          position={'absolute'}
                          top={0}
                          right={0}
                          bottom={0}
                          left={0}
                          background={
                            'linear-gradient(182deg, rgba(255, 255, 255, 0.00) 1.76%, #FFF 84.07%)'
                          }
                        >
                          <Button
                            size="xs"
                            variant={'whiteBase'}
                            leftIcon={<MyIcon name={'edit'} w={'13px'} />}
                            color={'black'}
                            position={'absolute'}
                            right={2}
                            bottom={2}
                            onClick={onOpenCustomPrompt}
                          >
                            {t('common:core.dataset.import.Custom prompt')}
                          </Button>
                        </Box>
                      </Box>
                    </Box>
                  )}
                </Box>
              )
            }
          ]}
          gridGap={3}
          px={3}
          py={3}
          defaultBg="white"
          activeBg="white"
          value={chunkSettingMode}
          w={'100%'}
          onChange={(e) => {
            setValue('chunkSettingMode', e);
          }}
        />
      </Box>
      {isOpenCustomPrompt && (
        <PromptTextarea
          defaultValue={qaPrompt}
          onChange={(e) => {
            setValue('qaPrompt', e);
          }}
          onClose={onCloseCustomPrompt}
        />
      )}
    </>
  );
};

export default CollectionChunkForm;

// Get chunk settings from form
export const collectionChunkForm2StoreChunkData = ({
  agentModel,
  vectorModel,
  ...data
}: CollectionChunkFormType & {
  agentModel: LLMModelItemType;
  vectorModel: EmbeddingModelItemType;
}): CollectionChunkFormType => {
  const {
    trainingType,
    autoIndexes,
    chunkSettingMode,
    chunkSize,
    chunkSplitter,
    indexSize,
    qaPrompt
  } = data;

  // 根据处理方式，获取 auto 和 custom 的参数。
  const trainingModeSize: {
    autoChunkSize: number;
    autoIndexSize: number;
    chunkSize: number;
    indexSize: number;
  } = (() => {
    if (trainingType === DatasetCollectionDataProcessModeEnum.qa) {
      return {
        autoChunkSize: getLLMDefaultChunkSize(agentModel),
        autoIndexSize: getMaxIndexSize(vectorModel),
        chunkSize,
        indexSize: getMaxIndexSize(vectorModel)
      };
    } else if (autoIndexes) {
      return {
        autoChunkSize: chunkAutoChunkSize,
        autoIndexSize: getAutoIndexSize(vectorModel),
        chunkSize,
        indexSize
      };
    } else {
      return {
        autoChunkSize: chunkAutoChunkSize,
        autoIndexSize: getAutoIndexSize(vectorModel),
        chunkSize,
        indexSize
      };
    }
  })();

  // 获取真实参数
  const {
    chunkSize: formatChunkIndex,
    indexSize: formatIndexSize,
    chunkSplitter: formatChunkSplitter
  } = (() => {
    if (chunkSettingMode === ChunkSettingModeEnum.auto) {
      return {
        chunkSize: trainingModeSize.autoChunkSize,
        indexSize: trainingModeSize.autoIndexSize,
        chunkSplitter: ''
      };
    } else {
      return {
        chunkSize: trainingModeSize.chunkSize,
        indexSize: trainingModeSize.indexSize,
        chunkSplitter
      };
    }
  })();

  return {
    ...data,
    chunkSize: formatChunkIndex,
    indexSize: formatIndexSize,
    chunkSplitter: formatChunkSplitter,
    qaPrompt: trainingType === DatasetCollectionDataProcessModeEnum.qa ? qaPrompt : undefined
  };
};
