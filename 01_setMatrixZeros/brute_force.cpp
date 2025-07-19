// ✅ Brute Force Approach – Set Matrix Zeroes

#include <iostream>
#include <vector>
using namespace std;

class Solution {
public:
    void setZeroes(vector<vector<int>>& matrix) {
        for (size_t i = 0; i < matrix.size(); i++) {
            for (size_t j = 0; j < matrix[i].size(); j++) {
                if (matrix[i][j] == 0) {
                    markRow(matrix, i);
                    markCol(matrix, j);
                }
            }
        }

        for (auto& row : matrix) {
            for (auto& val : row) {
                if (val == -1) {
                    val = 0;
                }
            }
        }
    }

private:
    void markRow(vector<vector<int>>& matrix, int rowNum) {
        for (int i = 0; i < matrix[rowNum].size(); i++) {
            if (matrix[rowNum][i] != 0) {
                matrix[rowNum][i] = -1;
            }
        }
    }

    void markCol(vector<vector<int>>& matrix, int colNum) {
        for (size_t i = 0; i < matrix.size(); i++) {
            if (matrix[i][colNum] != 0) {
                matrix[i][colNum] = -1;
            }
        }
    }
};

int main() {
    Solution sol;

    vector<vector<int>> matrix = {
        {1, 1, 1},
        {1, 0, 1},
        {1, 1, 1}
    };

    cout << "Original Matrix:\n";
    for (auto& row : matrix) {
        for (int val : row) cout << val << " ";
        cout << "\n";
    }

    sol.setZeroes(matrix);

    cout << "\nModified Matrix:\n";
    for (auto& row : matrix) {
        for (int val : row) cout << val << " ";
        cout << "\n";
    }

    return 0;
}
