import React from 'react';

import { StructuredMetadataTable } from '@backstage/core-components';

import Typography from '@material-ui/core/Typography';

import { getPermissionsNumber } from '../../utils/create-role-utils';
import { getMembers } from '../../utils/rbac-utils';
import { reviewStepMemebersTableColumns } from './AddedMembersTableColumn';
import { ReviewStepTable } from './ReviewStepTable';
import { selectedPermissionPoliciesColumn } from './SelectedPermissionPoliciesColumn';
import { RoleFormValues } from './types';

const tableMetadata = (values: RoleFormValues) => {
  const membersKey =
    values.selectedMembers.length > 0
      ? `Users and groups (${getMembers(values.selectedMembers)})`
      : 'Users and groups';
  const permissionPoliciesKey = `Permission policies (${getPermissionsNumber(
    values,
  )})`;
  return {
    'Name and description of role': (
      <>
        <p style={{ margin: '0px' }}>{values.name}</p>
        <br />
        <p style={{ margin: '0px' }}>{values.description}</p>
      </>
    ),
    [membersKey]: (
      <ReviewStepTable
        rows={values.selectedMembers}
        columns={reviewStepMemebersTableColumns()}
        tableWrapperWidth={550}
      />
    ),
    [permissionPoliciesKey]: (
      <ReviewStepTable
        rows={values.permissionPoliciesRows}
        columns={selectedPermissionPoliciesColumn()}
        tableWrapperWidth={700}
      />
    ),
  };
};

export const ReviewStep = ({
  values,
  isEditing,
}: {
  values: RoleFormValues;
  isEditing: boolean;
}) => {
  return (
    <div style={{ overflow: 'auto' }}>
      <Typography variant="h6">
        {isEditing ? 'Review and save' : 'Review and create'}
      </Typography>
      <StructuredMetadataTable
        dense
        metadata={tableMetadata(values)}
        options={{ titleFormat: (key: string) => key }}
      />
    </div>
  );
};
