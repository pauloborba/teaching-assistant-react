import React from "react";
import {
  Box,
  Collapse,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Typography,
} from "@mui/material";

import KeyboardArrowDownIcon from "@mui/icons-material/KeyboardArrowDown";
import KeyboardArrowUpIcon from "@mui/icons-material/KeyboardArrowUp";

export type Column = {
  id: string;
  label: string;
  align?: "right" | "left" | "center";
};

export type DetailColumn = {
  id: string;
  label: string;
  align?: "right" | "left" | "center";
};

export type GenericRow = {
  [key: string]: any;
  details?: any[];
};

type CollapsibleTableProps = {
  columns: Column[];
  detailColumns: DetailColumn[];
  rows: GenericRow[];
  detailTitle?: string;
  computeDetailRow?: (detail: any, parent: GenericRow) => any;
};

function CollapsibleRow({
  row,
  columns,
  detailColumns,
  detailTitle = "Details",
  computeDetailRow,
}: CollapsibleTableProps & { row: GenericRow }) {
  const [open, setOpen] = React.useState(false);

  return (
    <>
      {/* Linha principal */}
      <TableRow sx={{ "& > *": { borderBottom: "unset" } }}>
        <TableCell width={50}>
          {row.details && (
            <IconButton
              onClick={() => setOpen(!open)}
              sx={{
                width: 32,
                height: 32,
                minWidth: 32,
                minHeight: 32,
                padding: 0,
                borderRadius: "50%",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {open ? <KeyboardArrowUpIcon /> : <KeyboardArrowDownIcon />}
            </IconButton>
          )}
        </TableCell>

        {columns.map((col) => (
          <TableCell key={col.id} align={col.align || "left"}>
            {row[col.id]}
          </TableCell>
        ))}
      </TableRow>

      {/* Parte colapsada */}
      {row.details && (
        <TableRow>
          <TableCell
            colSpan={columns.length + 1}
            style={{ paddingBottom: 0, paddingTop: 0 }}
          >
            <Collapse in={open} timeout="auto" unmountOnExit>
              <Box sx={{ margin: 1 }}>
                <Typography variant="h6" gutterBottom>
                  {detailTitle}
                </Typography>

                <Table size="small">
                  <TableHead>
                    <TableRow>
                      {detailColumns.map((col) => (
                        <TableCell key={col.id} align={col.align || "left"}>
                          {col.label}
                        </TableCell>
                      ))}
                    </TableRow>
                  </TableHead>

                  <TableBody>
                    {row.details.map((detail, i) => {
                      const computed = computeDetailRow
                        ? computeDetailRow(detail, row)
                        : detail;

                      return (
                        <TableRow key={i}>
                          {detailColumns.map((col) => (
                            <TableCell key={col.id} align={col.align || "left"}>
                              {computed[col.id]}
                            </TableCell>
                          ))}
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>
              </Box>
            </Collapse>
          </TableCell>
        </TableRow>
      )}
    </>
  );
}

export default function CollapsibleTable(props: CollapsibleTableProps) {
  const { rows } = props;

  return (
    <TableContainer
      component={Paper}
      data-testid="exam-table"
    >
      <Table>
        <TableHead>
          <TableRow>
            <TableCell />
            {props.columns.map((col) => (
              <TableCell key={col.id} align={col.align || "left"}>
                {col.label}
              </TableCell>
            ))}
          </TableRow>
        </TableHead>

        <TableBody>
          {rows.map((row, i) => (
            <CollapsibleRow key={i} row={row} {...props} />
          ))}
        </TableBody>
      </Table>
    </TableContainer>
  );
}
